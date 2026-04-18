export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 minutes — needed for video upload + Meta processing wait
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'
import { AdapterFactory } from '@/lib/ads/factory'
import { supabaseAdmin } from '@/lib/supabase'
import { generateAudienceInterests, filterAudienceInterests } from '@/lib/ads/openai-ads'
import { MetaAdapter } from '@/lib/ads/adapters/meta'

const BUCKET = 'ad-creatives'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY
if (!ENC_KEY) throw new Error('ADS_ENCRYPTION_KEY env var is not set')

export async function POST(req: Request, { params }: { params: { id: string } }) {
    // Read optional overrides from request body (advantageAudience, advantageCreative, adFormat, bidStrategy, bidCapAmount, minRoasTarget)
    let bodyOverrides: any = {}
    try { bodyOverrides = await req.clone().json() } catch { /* no body is fine */ }
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: {
            brief: true,
            strategy: true,
            connectedAccount: {
                include: { integration: { include: { token: true } } }
            },
            creatives: { orderBy: { slotIndex: 'asc' } }
        }
    })

    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    if (campaign.status === 'PUBLISHED') {
        return NextResponse.json({ error: 'Esta campaña ya fue publicada' }, { status: 400 })
    }
    if (campaign.status === 'PUBLISHING') {
        return NextResponse.json({ error: 'Esta campaña ya está siendo publicada. Espera unos segundos e intenta de nuevo.' }, { status: 400 })
    }
    if (!campaign.connectedAccount) {
        return NextResponse.json({ error: 'Selecciona una cuenta publicitaria primero' }, { status: 400 })
    }
    if (!campaign.connectedAccount.integration?.token) {
        return NextResponse.json({ error: 'Reconecta tu cuenta de Meta/TikTok/Google' }, { status: 400 })
    }

    // Validate required fields per destination
    const dest = campaign.strategy.destination
    // All Meta campaigns require a Facebook page to create ad creatives
    if (campaign.platform === 'META' && !campaign.pageId) {
        return NextResponse.json({ error: 'Selecciona una Página de Facebook. Es obligatoria para todos los anuncios de Meta.' }, { status: 400 })
    }
    if (dest === 'whatsapp' && !campaign.whatsappNumber) {
        return NextResponse.json({ error: 'Selecciona un número de WhatsApp Business para esta campaña' }, { status: 400 })
    }
    if (['website'].includes(dest) && !campaign.destinationUrl) {
        return NextResponse.json({ error: 'Ingresa la URL de destino para esta campaña' }, { status: 400 })
    }
    if (!campaign.dailyBudgetUSD || campaign.dailyBudgetUSD <= 0) {
        return NextResponse.json({ error: 'El presupuesto diario debe ser mayor a 0' }, { status: 400 })
    }

    // Mark as publishing — all validations above must pass before this point
    await (prisma as any).adCampaignV2.update({
        where: { id: params.id },
        data: { status: 'PUBLISHING' }
    })

    try {
        const adapter = AdapterFactory.getAdapter(campaign.platform)

        let accessToken: string
        try {
            accessToken = decrypt(campaign.connectedAccount.integration.token.accessTokenEncrypted, ENC_KEY!)
        } catch {
            throw new Error('No se pudo leer el token de acceso. Reconecta tu cuenta desde Integraciones.')
        }

        // FIX: Map all strategy objectives to correct Meta OUTCOME_* values
        const objectiveMap: Record<string, string> = {
            conversions: 'OUTCOME_SALES',
            leads: 'OUTCOME_LEADS',
            traffic: 'OUTCOME_TRAFFIC',
            awareness: 'OUTCOME_AWARENESS',
            engagement: 'OUTCOME_ENGAGEMENT',
            app_promotion: 'OUTCOME_APP_PROMOTION',
        }
        const metaObjective = objectiveMap[campaign.strategy.objective] || 'OUTCOME_TRAFFIC'

        // Parse locations: "CO" → country, "city:KEY:Name" → city
        const countries: string[] = []
        const cities: { key: string; radius: number; distance_unit: string }[] = []
        for (const loc of campaign.locations as string[]) {
            if (loc.startsWith('city:')) {
                const parts = loc.split(':')
                const key = parts[1]
                if (key) cities.push({ key, radius: 25, distance_unit: 'kilometer' })
            } else if (loc.startsWith('cc:')) {
                // Format: "cc:CO:Bogotá" — extract country code
                const parts = loc.split(':')
                const countryCode = parts[1]
                if (countryCode?.length === 2 && !countries.includes(countryCode.toUpperCase())) {
                    countries.push(countryCode.toUpperCase())
                }
            } else if (loc.length === 2) {
                countries.push(loc.toUpperCase())
            }
        }
        const geoLocations = (countries.length > 0 || cities.length > 0)
            ? {
                ...(countries.length > 0 ? { countries } : {}),
                ...(cities.length > 0 ? { cities } : {})
            }
            : undefined

        // FIX: pass all creative copies so the adapter creates one ad per variation
        // Only include mediaUrl if it's a real HTTP URL (never blob:// or null)
        const isValidUrl = (url: string | null) => typeof url === 'string' && url.startsWith('http')
        const creativeCopies = campaign.creatives
            .filter((c: any) => c.primaryText)
            .map((c: any) => ({
                primaryText: c.primaryText || '',
                headline: c.headline || '',
                description: c.description || '',
                imageUrl: isValidUrl(c.mediaUrl) ? c.mediaUrl : undefined
            }))

        const messengerDestination = dest === 'whatsapp'
            ? 'WHATSAPP' as const
            : dest === 'messenger'
                ? 'MESSENGER' as const
                : dest === 'instagram' && campaign.strategy.objective === 'engagement'
                    ? 'INSTAGRAM' as const
                    : undefined

        // ── AI Audience Segmentation (Meta only) ──────────────────────────────
        // Generate interest keywords from the brief with OpenAI, then resolve
        // each keyword to a real Meta interest ID via the Targeting Search API.
        let audienceInterests: Array<{ id: string; name: string }> = []
        if (campaign.platform === 'META') {
            let audienceError = 'No se pudieron generar intereses de audiencia. Verifica tu API Key de OpenAI en Configuración → IA.'
            try {
                const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
                if (!oaiConfig?.isValid || !oaiConfig.apiKeyEnc) {
                    audienceError = 'Configura tu API Key de OpenAI en Configuración → IA para publicar campañas de Meta con segmentación de audiencia.'
                } else {
                    const oaiKey = decrypt(oaiConfig.apiKeyEnc, ENC_KEY!)
                    const keywords = await generateAudienceInterests(campaign.brief, oaiKey, oaiConfig.model || 'gpt-4o')
                    console.log(`[Publish] AI generated ${keywords.length} interest keywords:`, keywords.join(', '))

                    const metaAdapter = adapter as MetaAdapter
                    const resolvedAll = await Promise.allSettled(
                        keywords.map(kw => metaAdapter.searchTargetingInterests(accessToken, kw))
                    )
                    // Flatten fulfilled results only, deduplicate by id, cap at 10
                    const seen = new Set<string>()
                    for (const result of resolvedAll) {
                        if (result.status !== 'fulfilled') continue
                        for (const interest of result.value) {
                            if (!seen.has(interest.id)) {
                                seen.add(interest.id)
                                audienceInterests.push(interest)
                            }
                        }
                    }
                    // Deduplicate by id, cap candidates before filtering
                    audienceInterests = audienceInterests.slice(0, 40)
                    console.log(`[Publish] Resolved ${audienceInterests.length} raw Meta interest candidates`)

                    // AI filtering step — remove irrelevant results (e.g. "Acne Studios" for skincare)
                    audienceInterests = await filterAudienceInterests(campaign.brief, audienceInterests, oaiKey, oaiConfig.model || 'gpt-4o-mini')
                    audienceInterests = audienceInterests.slice(0, 15)
                    console.log(`[Publish] After AI filter: ${audienceInterests.length} Meta interests:`, audienceInterests.map(i => i.name).join(', '))
                    if (audienceInterests.length === 0) {
                        audienceError = 'Meta no encontró intereses reales para las keywords generadas por IA. Intenta enriquecer el Brief de tu negocio con más detalles.'
                    }
                }
            } catch (e: any) {
                console.error('[Publish] Audience interest generation failed:', e)
                audienceError = e?.message || audienceError
            }

            if (audienceInterests.length === 0) {
                // No interests found — proceed with broad targeting (Meta Advantage+)
                // The adapter simply omits flexible_spec which is valid for all objectives
                console.warn('[Publish] No audience interests resolved — publishing with broad targeting:', audienceError)
            }
        }

        const result = await adapter.publishFromDraft(
            accessToken,
            campaign.connectedAccount.providerAccountId,
            {
                name: campaign.name,
                objective: metaObjective,
                budgetType: 'DAILY',
                budgetAmount: campaign.dailyBudgetUSD,
                geoLocations,
                // Fallback single-copy fields (used if copies array is empty)
                primaryText: campaign.creatives[0]?.primaryText || campaign.brief.description,
                headline: campaign.creatives[0]?.headline || campaign.brief.name,
                description: campaign.creatives[0]?.description || campaign.brief.valueProposition,
                cta: (() => {
                    // Map brief CTA text → Meta CTA enum
                    const ctaMap: Record<string, string> = {
                        'Comprar ahora': 'SHOP_NOW',
                        'Comprar': 'SHOP_NOW',
                        'Ordenar ahora': 'ORDER_NOW',
                        'Registrarse': 'SIGN_UP',
                        'Suscribirse': 'SUBSCRIBE',
                        'Descargar': 'DOWNLOAD',
                        'Obtener oferta': 'GET_OFFER',
                        'Solicitar cotización': 'GET_QUOTE',
                        'Contactar': 'CONTACT_US',
                        'Enviar mensaje': 'SEND_MESSAGE',
                        'Más información': 'LEARN_MORE',
                        'Ver más': 'LEARN_MORE',
                        'Aplicar ahora': 'APPLY_NOW',
                    }
                    const briefCta = campaign.brief.mainCTA as string | undefined
                    if (briefCta && ctaMap[briefCta]) return ctaMap[briefCta]
                    // Objective-based fallback
                    const obj = campaign.strategy.objective as string
                    const dest = campaign.strategy.destination as string
                    if (dest === 'whatsapp' || dest === 'messenger' || dest === 'instagram') return 'SEND_MESSAGE'
                    if (obj === 'leads') return 'SIGN_UP'
                    if (obj === 'conversions') return 'SHOP_NOW'
                    if (obj === 'engagement') return 'LEARN_MORE'
                    return 'LEARN_MORE'
                })(),
                providerPageId: campaign.pageId || undefined,
                providerWhatsAppNumber: campaign.whatsappNumber || undefined,
                welcomeMessage: campaign.welcomeMessage || undefined,
                pixelId: campaign.pixelId || undefined,
                destinationUrl: campaign.destinationUrl || undefined,
                messengerDestination,
                // Multi-copy: creates one ad per variation
                copies: creativeCopies.length > 0 ? creativeCopies : undefined,
                assets: campaign.creatives
                    .filter((c: any) => isValidUrl(c.mediaUrl))
                    .map((c: any) => ({
                        type: (c.mediaType?.toUpperCase() || 'IMAGE') as 'IMAGE' | 'VIDEO',
                        storageUrl: c.mediaUrl!
                    })),
                // AI audience interests (Meta only — resolved from brief via OpenAI + Meta Targeting Search)
                ...(audienceInterests.length > 0 ? { audienceInterests } : {}),
                // Pass advantageType so Google adapter knows Search/Display/PMax
                ...(campaign.platform === 'GOOGLE_ADS' ? { advantageType: campaign.strategy.advantageType } : {}),
                // Advantage+ Audience — from UI override
                ...(bodyOverrides.advantageAudience !== undefined ? { advantageAudience: Boolean(bodyOverrides.advantageAudience) } : {}),
                // Advantage+ Creative — auto-enhances creatives via degrees_of_freedom_spec
                ...(bodyOverrides.advantageCreative !== undefined ? { advantageCreative: Boolean(bodyOverrides.advantageCreative) } : {}),
                // Ad format — single (default) or carousel (child_attachments)
                ...(bodyOverrides.adFormat ? { adFormat: bodyOverrides.adFormat } : {}),
                // Bid strategy overrides — from UI
                ...(bodyOverrides.bidStrategy ? { bidStrategy: bodyOverrides.bidStrategy } : {}),
                ...(bodyOverrides.bidCapAmount ? { bidCapAmount: Number(bodyOverrides.bidCapAmount) } : {}),
                ...(bodyOverrides.minRoasTarget ? { minRoasTarget: Number(bodyOverrides.minRoasTarget) } : {})
            } as any
        )

        await (prisma as any).adCampaignV2.update({
            where: { id: params.id },
            data: {
                status: 'PUBLISHED',
                providerCampaignId: result.providerCampaignId,
                providerGroupId: result.providerGroupId || null,
                providerAdId: result.providerAdId || null,
                publishedAt: new Date()
            }
        })

        // Delete uploaded media from Supabase Storage after successful publish
        const storageUrlMarker = `/object/public/${BUCKET}/`
        const storagePaths = campaign.creatives
            .filter((c: any) => c.mediaUrl?.includes(storageUrlMarker))
            .map((c: any) => {
                const idx = c.mediaUrl.indexOf(storageUrlMarker)
                // Strip query params (e.g. ?t=123) so path is clean
                const rawPath = c.mediaUrl.slice(idx + storageUrlMarker.length)
                return rawPath.split('?')[0]
            })
            .filter(Boolean)

        if (storagePaths.length > 0) {
            try {
                const { error: removeErr } = await supabaseAdmin.storage.from(BUCKET).remove(storagePaths)
                if (removeErr) console.warn('[PublishCampaign] Storage remove partial error:', removeErr.message)
                else console.log(`[PublishCampaign] Deleted ${storagePaths.length} file(s) from storage`)
                await (prisma as any).adCreative.updateMany({
                    where: { campaignId: params.id },
                    data: { mediaUrl: null }
                })
            } catch (e) {
                console.warn('[PublishCampaign] Storage cleanup failed (non-fatal):', e)
            }
        }

        return NextResponse.json({ success: true, result })
    } catch (err: any) {
        console.error('[PublishCampaign]', err)

        // Make Meta errors more actionable
        let userMessage = err.message || 'Error al publicar la campaña'
        const msg = userMessage.toLowerCase()
        if (msg.includes('whatsapp') && msg.includes('personal')) {
            userMessage = 'Tu página tiene un WhatsApp personal vinculado. Para anuncios de WhatsApp necesitas una cuenta de WhatsApp Business. Ve a Configuración de la Página → WhatsApp y vincula tu número de WhatsApp Business.'
        } else if (msg.includes('whatsapp') && msg.includes('business')) {
            userMessage = 'Conecta una cuenta de WhatsApp Business a tu Página de Facebook antes de publicar este anuncio. Ve a Configuración de la Página → WhatsApp.'
        } else if (msg.includes('método de pago') || msg.includes('payment')) {
            userMessage = 'Tu cuenta publicitaria no tiene un método de pago válido. Agrega un método de pago en el Administrador de Anuncios de Meta.'
        } else if (msg.includes('permiso') || msg.includes('permission') || msg.includes('autorización')) {
            userMessage = 'Sin permisos suficientes. Reconecta tu cuenta de Meta desde la sección de Integraciones.'
        }

        await (prisma as any).adCampaignV2.update({
            where: { id: params.id },
            data: {
                status: 'FAILED',
                failureReason: userMessage
            }
        })

        return NextResponse.json({ error: userMessage }, { status: 500 })
    }
}

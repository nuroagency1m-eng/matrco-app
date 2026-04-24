/**
 * Broadcast Worker — envía mensajes masivos de WhatsApp por Baileys
 * con delay configurable entre contactos e imagen opcional.
 * Versión simplificada: solo Baileys, solo texto + imagen.
 */

import { prisma } from '@/lib/prisma'
import { BaileysManager } from '@/lib/baileys-manager'
import { decrypt as decryptAds } from '@/lib/ads/encryption'

const ADS_ENC_KEY = process.env.ADS_ENCRYPTION_KEY || ''

const OPENAI_BASE = 'https://api.openai.com/v1'

async function generateUniqueMessage(
    prompt: string,
    apiKey: string,
    botRules?: string | null,
    messageExample?: string | null,
): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const systemContent = [
        botRules?.trim() ? `REGLAS Y PERSONALIDAD DEL BOT:\n${botRules.trim()}` : null,
        `Eres un experto en ventas por WhatsApp. Genera mensajes cortos, cálidos y únicos.
REGLAS:
- NUNCA uses el nombre del contacto, el mensaje debe ser genérico
- Incluir emojis estratégicamente
- NUNCA generar el mismo mensaje dos veces`,
        messageExample?.trim()
            ? `EJEMPLAR DE REFERENCIA (seguí este estilo exacto, pero con contenido diferente):\n"${messageExample.trim()}"`
            : null,
    ].filter(Boolean).join('\n\n')

    const userContent = messageExample?.trim()
        ? `Genera un mensaje de WhatsApp único para este tema: "${prompt}". Seguí el estilo del ejemplar pero con contenido completamente diferente. Solo el mensaje, sin comillas ni explicaciones.`
        : `Genera un mensaje de WhatsApp único basado en: "${prompt}". Sin nombres propios. Solo el mensaje, sin comillas ni explicaciones.`

    try {
        const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            signal: controller.signal,
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemContent },
                    { role: 'user', content: userContent },
                ],
                temperature: 1.0,
                max_tokens: 200,
            }),
        })
        if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
        const data = await res.json()
        return data.choices?.[0]?.message?.content?.trim() || prompt
    } finally {
        clearTimeout(timeout)
    }
}

async function getOpenAIKey(userId: string): Promise<string> {
    const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId } })
    if (oaiConfig?.isValid && oaiConfig.apiKeyEnc) {
        try { return decryptAds(oaiConfig.apiKeyEnc, ADS_ENC_KEY) } catch {}
    }
    // Fallback: global key from AppSetting
    const setting = await (prisma as any).appSetting.findUnique({ where: { key: 'openai_global_key' } })
    if (setting?.value) {
        try { return decryptAds(setting.value, ADS_ENC_KEY) } catch {}
    }
    return ''
}

function delayMs(value: number, unit: string): number {
    if (unit === 'minutes') return value * 60 * 1000
    return value * 1000
}

export async function executeBroadcast(campaignId: string) {
    const campaign = await (prisma as any).broadcastCampaign.findUnique({
        where: { id: campaignId },
        include: {
            images: { orderBy: { order: 'asc' } },
            contacts: { where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } },
            bot: { select: { systemPromptTemplate: true } },
        },
    })

    if (!campaign || campaign.status === 'COMPLETED' || campaign.status === 'FAILED') return

    await (prisma as any).broadcastCampaign.update({
        where: { id: campaignId },
        data: { status: 'RUNNING', startedAt: new Date() },
    })

    const openaiKey = await getOpenAIKey(campaign.userId)
    const useAI = !!openaiKey
    if (!useAI) {
        console.warn(`[BROADCAST] Sin OpenAI API Key — campaña ${campaignId} enviará el prompt como mensaje fijo`)
    }

    // Auto-reconnect Baileys si hay sesión en disco pero no en memoria
    const currentStatus = BaileysManager.getStatus(campaign.botId)
    if (currentStatus.status !== 'connected') {
        await BaileysManager.connect(campaign.botId, campaign.name, openaiKey, '')
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 1000))
            if (BaileysManager.getStatus(campaign.botId).status === 'connected') break
        }
    }
    if (BaileysManager.getStatus(campaign.botId).status !== 'connected') {
        await (prisma as any).broadcastCampaign.update({ where: { id: campaignId }, data: { status: 'FAILED' } })
        console.error(`[BROADCAST] Bot ${campaign.botId} no conectado. Campaña ${campaignId} marcada como FAILED.`)
        return
    }

    const images: any[] = campaign.images || []
    let imageIndex: number = campaign.imageIndex || 0
    const delayBetween = delayMs(campaign.delayValue, campaign.delayUnit)

    for (const contact of campaign.contacts) {
        // Verificar si la campaña fue pausada/cancelada
        const fresh = await (prisma as any).broadcastCampaign.findUnique({
            where: { id: campaignId },
            select: { status: true },
        })
        if (fresh?.status === 'PAUSED' || fresh?.status === 'FAILED') break

        // Verificar que el contacto sigue en PENDING
        const stillExists = await (prisma as any).broadcastContact.findUnique({
            where: { id: contact.id },
            select: { id: true, status: true },
        })
        if (!stillExists || stillExists.status !== 'PENDING') continue

        try {
            const conn = BaileysManager.getStatus(campaign.botId)
            if (conn.status !== 'connected') {
                await (prisma as any).broadcastContact.update({
                    where: { id: contact.id },
                    data: { status: 'FAILED', error: 'Bot desconectado', sentAt: new Date() },
                })
                await (prisma as any).broadcastCampaign.update({
                    where: { id: campaignId },
                    data: { failedCount: { increment: 1 } },
                })
                continue
            }

            const generated = useAI
                ? await generateUniqueMessage(
                    campaign.prompt, openaiKey,
                    campaign.bot?.systemPromptTemplate,
                    campaign.messageExample,
                )
                : (campaign.messageExample?.trim() || campaign.prompt || '')

            const nextIndex = images.length > 0 ? (imageIndex + 1) % images.length : 0
            let logImageUrl: string | null = null

            // Enviar imagen si hay
            if (images.length > 0) {
                const img = images[imageIndex % images.length]
                logImageUrl = img.url
                await BaileysManager.sendImage(campaign.botId, contact.phone, img.url).catch(() => {})
                await new Promise(r => setTimeout(r, 1500))
            }

            // Enviar texto
            const sent = await BaileysManager.sendText(campaign.botId, contact.phone, generated)
            if (!sent) throw new Error('sendText retornó false')

            await (prisma as any).broadcastContact.update({
                where: { id: contact.id },
                data: { status: 'SENT', sentAt: new Date() },
            })
            await (prisma as any).broadcastLog.create({
                data: {
                    campaignId,
                    phone: contact.phone,
                    name: contact.name || null,
                    message: generated,
                    imageUrl: logImageUrl,
                    status: 'SENT',
                },
            })
            await (prisma as any).broadcastCampaign.update({
                where: { id: campaignId },
                data: { sentCount: { increment: 1 }, imageIndex: nextIndex },
            })
            imageIndex = nextIndex
        } catch (err: any) {
            await (prisma as any).broadcastContact.update({
                where: { id: contact.id },
                data: { status: 'FAILED', error: err.message || 'Error desconocido', sentAt: new Date() },
            })
            await (prisma as any).broadcastLog.create({
                data: {
                    campaignId,
                    phone: contact.phone,
                    name: contact.name || null,
                    message: '',
                    status: 'FAILED',
                    error: err.message || 'Error desconocido',
                },
            })
            await (prisma as any).broadcastCampaign.update({
                where: { id: campaignId },
                data: { failedCount: { increment: 1 } },
            })
        }

        await new Promise(r => setTimeout(r, delayBetween))
    }

    const finalCampaign = await (prisma as any).broadcastCampaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
    })
    if (finalCampaign?.status === 'RUNNING') {
        await (prisma as any).broadcastCampaign.update({
            where: { id: campaignId },
            data: { status: 'COMPLETED', completedAt: new Date() },
        })
    }
}

// Scheduler — revisa cada minuto campañas programadas
declare global { var __broadcast_scheduler_started: boolean | undefined }

export function startBroadcastScheduler() {
    if (global.__broadcast_scheduler_started) return
    global.__broadcast_scheduler_started = true

    setInterval(async () => {
        try {
            const due = await (prisma as any).broadcastCampaign.findMany({
                where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
                select: { id: true },
            })
            for (const c of due) {
                executeBroadcast(c.id).catch(err =>
                    console.error(`[BROADCAST] Error ejecutando campaña ${c.id}:`, err)
                )
            }
        } catch (err) {
            console.error('[BROADCAST] Scheduler error:', err)
        }
    }, 60 * 1000)
}

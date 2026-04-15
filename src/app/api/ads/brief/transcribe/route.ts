export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'
import { transcribeAudio } from '@/lib/ads/openai-ads'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY || ''

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get user's OpenAI config
    const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
    if (!oaiConfig?.isValid) {
        return NextResponse.json({ error: 'Configura tu OpenAI API Key primero en Configuración' }, { status: 400 })
    }
    const apiKey = decrypt(oaiConfig.apiKeyEnc, ENC_KEY)

    // Parse multipart form
    const formData = await req.formData()
    const file = formData.get('audio') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió audio' }, { status: 400 })

    try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const text = await transcribeAudio(buffer, file.name || 'audio.webm', apiKey)

        if (!text || text.trim().length < 10) {
            return NextResponse.json({ error: 'No se pudo transcribir el audio. Asegúrate de hablar claramente.' }, { status: 422 })
        }

        return NextResponse.json({ text: text.trim() })
    } catch (err: any) {
        console.error('[Transcribe]', err)
        return NextResponse.json({ error: err.message || 'Error al transcribir el audio' }, { status: 500 })
    }
}

export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/ads/encryption'
import { validateApiKey } from '@/lib/ads/openai-ads'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY || ''

// GET — user credits + their openai config + admin key status
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [dbUser, openaiConfig, adminConfig] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { aiCredits: true, preferOwnKey: true },
    }),
    (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } }),
    (prisma as any).adminConfig.findUnique({ where: { id: 'global' } }),
  ])

  return NextResponse.json({
    aiCredits: dbUser?.aiCredits ?? 0,
    preferOwnKey: dbUser?.preferOwnKey ?? false,
    adminHasKey: !!(adminConfig?.openaiKeyEnc),
    ownKey: openaiConfig
      ? {
          model: openaiConfig.model,
          isValid: openaiConfig.isValid,
          validatedAt: openaiConfig.validatedAt,
          apiKeyMasked: '••••••••••••' + decrypt(openaiConfig.apiKeyEnc, ENC_KEY).slice(-4),
        }
      : null,
  })
}

// PUT — toggle preferOwnKey
export async function PUT(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { preferOwnKey } = await req.json()

  await prisma.user.update({
    where: { id: user.id },
    data: { preferOwnKey: Boolean(preferOwnKey) },
  })

  return NextResponse.json({ success: true })
}

// POST — save user's own OpenAI API key
export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { apiKey, model = 'gpt-4o' } = await req.json()
  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'API Key requerida' }, { status: 400 })
  }

  const isValid = await validateApiKey(apiKey.trim())
  const apiKeyEnc = encrypt(apiKey.trim(), ENC_KEY)

  await (prisma as any).openAIConfig.upsert({
    where: { userId: user.id },
    create: { userId: user.id, apiKeyEnc, model, isValid, validatedAt: isValid ? new Date() : null },
    update: { apiKeyEnc, model, isValid, validatedAt: isValid ? new Date() : null },
  })

  return NextResponse.json({
    success: true,
    isValid,
    apiKeyMasked: '••••••••••••' + apiKey.trim().slice(-4),
  })
}

// DELETE — remove user's own API key
export async function DELETE() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await (prisma as any).openAIConfig.deleteMany({ where: { userId: user.id } })
  return NextResponse.json({ success: true })
}

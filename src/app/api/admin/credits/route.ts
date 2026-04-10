export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// GET — list users with their credit balances
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') ?? ''

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      aiCredits: true,
      preferOwnKey: true,
      plan: true,
      isActive: true,
    },
    orderBy: { fullName: 'asc' },
    take: 50,
  })

  return NextResponse.json({ users })
}

// POST — assign / adjust credits for a user
export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { userId, credits, mode = 'set' } = await req.json()
  // mode: 'set' = assign exact amount | 'add' = add to existing | 'subtract' = deduct

  if (!userId || typeof credits !== 'number' || credits < 0) {
    return NextResponse.json({ error: 'userId y credits (≥0) son requeridos' }, { status: 400 })
  }

  let data: { aiCredits: number }

  if (mode === 'add') {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { aiCredits: true } })
    data = { aiCredits: (current?.aiCredits ?? 0) + credits }
  } else if (mode === 'subtract') {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { aiCredits: true } })
    data = { aiCredits: Math.max(0, (current?.aiCredits ?? 0) - credits) }
  } else {
    data = { aiCredits: credits }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, fullName: true, aiCredits: true },
  })

  return NextResponse.json({ success: true, user: updated })
}

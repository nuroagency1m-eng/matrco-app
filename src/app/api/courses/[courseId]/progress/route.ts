import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { videoId, percent } = await req.json()
  if (!videoId || typeof percent !== 'number') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const completed = percent >= 95

  await (prisma as any).videoProgress.upsert({
    where: { userId_videoId: { userId: user.id, videoId } },
    update: {
      percent,
      completed,
      updatedAt: new Date(),
    },
    create: {
      userId: user.id,
      videoId,
      courseId: params.courseId,
      percent,
      completed,
    },
  })

  return NextResponse.json({ ok: true, completed })
}

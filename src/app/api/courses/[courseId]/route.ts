export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** GET /api/courses/[courseId] — detalle del curso; incluye videos solo si APPROVED */
export async function GET(
  _req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        videos: { orderBy: { order: 'asc' } },
        enrollments: { where: { userId: user.id } },
      },
    })

    if (!course || !course.active) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    const hasPlan = user.plan !== 'NONE'
    const enrollment = course.enrollments[0] ?? null
    const approved = enrollment?.status === 'APPROVED'

    // Obtener progreso del usuario para este curso
    let progressMap: Record<string, number> = {}
    if (approved && course.videos.length > 0) {
      const progressRows = await (prisma as any).videoProgress.findMany({
        where: { userId: user.id, courseId: params.courseId },
        select: { videoId: true, percent: true, completed: true },
      })
      for (const row of progressRows) {
        progressMap[row.videoId] = row.percent
      }
    }

    // Calcular qué videos están desbloqueados (orden secuencial)
    // Video 1 siempre desbloqueado, video N desbloqueado si video N-1 está al 95%+
    const videosWithUnlock = approved
      ? course.videos.map((v, idx) => {
          const prevVideo = idx === 0 ? null : course.videos[idx - 1]
          const unlocked = idx === 0 || (prevVideo ? (progressMap[prevVideo.id] ?? 0) >= 95 : false)
          return {
            id: v.id,
            title: v.title,
            youtubeUrl: v.youtubeUrl,
            order: v.order,
            unlocked,
            percent: progressMap[v.id] ?? 0,
            completed: (progressMap[v.id] ?? 0) >= 95,
          }
        })
      : []

    return NextResponse.json({
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        coverUrl: course.coverUrl,
        price: Number(course.price),
        freeForPlan: course.freeForPlan,
        createdAt: course.createdAt,
        videos: videosWithUnlock,
        videosCount: course.videos.length,
        locked: !hasPlan,
        enrollment,
      },
    })
  } catch (err) {
    console.error('[GET /api/courses/[courseId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

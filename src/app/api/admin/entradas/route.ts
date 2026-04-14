export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/** GET /api/admin/entradas — list all events */
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { tickets: true } },
    },
  })

  return NextResponse.json({
    events: events.map(e => ({
      ...e,
      price: Number(e.price),
      ticketCount: e._count.tickets,
    })),
  })
}

/** POST /api/admin/entradas — create event */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const body = await req.json()
    const { title, description, image, price, date, location, capacity, active } = body

    if (!title?.trim()) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })
    if (!price || isNaN(Number(price)) || Number(price) <= 0) return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description?.trim() ?? '',
        image: image?.trim() || null,
        price: Number(price),
        date: date ? new Date(date) : null,
        location: location?.trim() || null,
        capacity: capacity ? parseInt(capacity) : null,
        active: active !== false,
      },
    })

    return NextResponse.json({ event: { ...event, price: Number(event.price) } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/entradas]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** GET /api/entradas/[eventId] — public event details */
export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.eventId, active: true },
      select: {
        id: true,
        title: true,
        description: true,
        image: true,
        price: true,
        date: true,
        location: true,
        capacity: true,
        _count: { select: { tickets: { where: { status: { not: 'REJECTED' } } } } },
      },
    })

    if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

    const soldCount = event._count.tickets
    const available = event.capacity != null ? event.capacity - soldCount : null

    return NextResponse.json({
      event: {
        ...event,
        price: Number(event.price),
        available,
        soldOut: available !== null && available <= 0,
      },
    })
  } catch (err) {
    console.error('[GET /api/entradas/[eventId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

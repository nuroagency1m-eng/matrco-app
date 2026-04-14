export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/** POST /api/admin/entradas/[eventId]/types — create a ticket type */
export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()
  try {
    const { name, price, capacity, active, sortOrder } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    if (!price || isNaN(Number(price)) || Number(price) < 0) return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })

    const tt = await prisma.ticketType.create({
      data: {
        eventId: params.eventId,
        name: name.trim(),
        price: Number(price),
        capacity: capacity ? parseInt(capacity) : null,
        active: active !== false,
        sortOrder: sortOrder ?? 0,
      },
    })
    return NextResponse.json({ ticketType: { ...tt, price: Number(tt.price) } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/entradas/[eventId]/types]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

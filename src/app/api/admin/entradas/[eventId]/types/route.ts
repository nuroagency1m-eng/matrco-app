export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/** POST /api/admin/entradas/[eventId]/types — create a ticket type */
export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()
  try {
    const { name, description, image, price, capacity, active, sortOrder } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    if (!price || isNaN(Number(price)) || Number(price) < 0) return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })

    const parsedCapacity = capacity !== undefined && capacity !== null && capacity !== '' ? parseInt(String(capacity), 10) : null
    if (parsedCapacity !== null && (isNaN(parsedCapacity) || parsedCapacity < 1))
      return NextResponse.json({ error: 'Capacidad debe ser un número positivo' }, { status: 400 })

    const tt = await prisma.ticketType.create({
      data: {
        eventId: params.eventId,
        name: name.trim(),
        description: description?.trim() || null,
        image: image?.trim() || null,
        price: Number(price),
        capacity: parsedCapacity,
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

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/** PATCH /api/admin/entradas/[eventId]/types/[typeId] — update ticket type */
export async function PATCH(req: NextRequest, { params }: { params: { eventId: string; typeId: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()
  try {
    const { name, price, capacity, active, sortOrder } = await req.json()
    const tt = await prisma.ticketType.update({
      where: { id: params.typeId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(price !== undefined && { price: Number(price) }),
        ...(capacity !== undefined && { capacity: capacity ? parseInt(capacity) : null }),
        ...(active !== undefined && { active }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })
    return NextResponse.json({ ticketType: { ...tt, price: Number(tt.price) } })
  } catch (err) {
    console.error('[PATCH ticket type]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/** DELETE /api/admin/entradas/[eventId]/types/[typeId] — delete ticket type */
export async function DELETE(_req: NextRequest, { params }: { params: { eventId: string; typeId: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()
  try {
    const hasOrders = await prisma.ticketOrder.count({ where: { ticketTypeId: params.typeId } })
    if (hasOrders > 0) {
      // Don't delete if has orders — just deactivate
      await prisma.ticketType.update({ where: { id: params.typeId }, data: { active: false } })
      return NextResponse.json({ ok: true, deactivated: true })
    }
    await prisma.ticketType.delete({ where: { id: params.typeId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE ticket type]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

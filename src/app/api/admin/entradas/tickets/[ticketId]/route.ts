export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sendTicketEmail } from '@/lib/email'

/** PATCH /api/admin/entradas/tickets/[ticketId]
 * body: { action: 'approve' | 'reject' | 'checkin', notes? }
 */
export async function PATCH(req: NextRequest, { params }: { params: { ticketId: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const { action, notes } = await req.json()
    if (!['approve', 'reject', 'checkin'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    const ticket = await prisma.ticketOrder.findUnique({
      where: { id: params.ticketId },
      include: { event: true },
    })
    if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

    if (action === 'checkin') {
      if (ticket.status !== 'APPROVED') {
        return NextResponse.json({ error: 'El ticket no está aprobado' }, { status: 400 })
      }
      if (ticket.checkedIn) {
        return NextResponse.json({ error: 'Este ticket ya fue utilizado', checkedInAt: ticket.checkedInAt }, { status: 409 })
      }
      await prisma.ticketOrder.update({
        where: { id: params.ticketId },
        data: { checkedIn: true, checkedInAt: new Date() },
      })
      return NextResponse.json({ ok: true, action: 'checkin' })
    }

    if (action === 'approve') {
      if (ticket.status === 'APPROVED') {
        return NextResponse.json({ error: 'Ya está aprobado' }, { status: 400 })
      }
      await prisma.ticketOrder.update({
        where: { id: params.ticketId },
        data: { status: 'APPROVED', notes: notes || null },
      })

      sendTicketEmail(ticket.customerEmail, ticket.customerName, {
        ticketCode: ticket.ticketCode,
        eventTitle: ticket.event.title,
        ticketTypeName: ticket.ticketTypeName,
        eventDate: ticket.event.date,
        eventLocation: ticket.event.location,
        eventImage: ticket.event.image,
        quantity: ticket.quantity,
        totalPrice: Number(ticket.totalPrice),
        paymentMethod: ticket.paymentMethod,
      }).catch(e => console.error('[email] ticket approve:', e))

      return NextResponse.json({ ok: true, action: 'approve' })
    }

    if (action === 'reject') {
      await prisma.ticketOrder.update({
        where: { id: params.ticketId },
        data: { status: 'REJECTED', notes: notes || null },
      })
      return NextResponse.json({ ok: true, action: 'reject' })
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  } catch (err) {
    console.error('[PATCH /api/admin/entradas/tickets/[ticketId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

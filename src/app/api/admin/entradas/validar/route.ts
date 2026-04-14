export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/** POST /api/admin/entradas/validar
 * body: { code: string, confirm?: boolean }
 * - confirm=false (default): just look up the ticket, return status
 * - confirm=true: mark as checked in
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const { code, confirm } = await req.json()
    if (!code?.trim()) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

    const ticket = await prisma.ticketOrder.findUnique({
      where: { ticketCode: code.trim().toUpperCase() },
      include: { event: { select: { title: true, date: true, location: true } } },
    })

    if (!ticket) {
      return NextResponse.json({ result: 'not_found' }, { status: 200 })
    }

    if (ticket.status === 'REJECTED') {
      return NextResponse.json({ result: 'rejected' }, { status: 200 })
    }

    if (ticket.status === 'PENDING') {
      return NextResponse.json({ result: 'pending', ticket: { customerName: ticket.customerName, eventTitle: ticket.event.title } }, { status: 200 })
    }

    // APPROVED
    if (ticket.checkedIn) {
      return NextResponse.json({
        result: 'already_used',
        ticket: { customerName: ticket.customerName, eventTitle: ticket.event.title, checkedInAt: ticket.checkedInAt },
      }, { status: 200 })
    }

    if (confirm) {
      await prisma.ticketOrder.update({
        where: { id: ticket.id },
        data: { checkedIn: true, checkedInAt: new Date() },
      })
      return NextResponse.json({
        result: 'checked_in',
        ticket: { customerName: ticket.customerName, quantity: ticket.quantity, eventTitle: ticket.event.title },
      }, { status: 200 })
    }

    // Valid, not yet used — return details for confirmation
    return NextResponse.json({
      result: 'valid',
      ticket: {
        id: ticket.id,
        customerName: ticket.customerName,
        customerEmail: ticket.customerEmail,
        quantity: ticket.quantity,
        eventTitle: ticket.event.title,
        eventDate: ticket.event.date,
      },
    }, { status: 200 })
  } catch (err) {
    console.error('[POST /api/admin/entradas/validar]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

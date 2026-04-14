export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyBscTransaction } from '@/lib/blockchain'
import { sendTicketEmail } from '@/lib/email'

function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `TKT-${seg()}-${seg()}`
}

/** POST /api/entradas/[eventId]/orders — public ticket purchase (no login required) */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const body = await req.json()
    const { customerName, customerEmail, customerPhone, ticketTypeId, quantity, paymentMethod, proofUrl, txHash } = body

    // Validate required fields
    if (!customerName?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    if (!customerEmail?.trim() || !customerEmail.includes('@')) return NextResponse.json({ error: 'Email válido requerido' }, { status: 400 })
    if (!customerPhone?.trim()) return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 })
    if (!ticketTypeId) return NextResponse.json({ error: 'Tipo de entrada requerido' }, { status: 400 })

    // Load event and ticket type together
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId, active: true },
      include: { event: true },
    })
    if (!ticketType) return NextResponse.json({ error: 'Tipo de entrada no disponible' }, { status: 404 })
    if (ticketType.eventId !== params.eventId) return NextResponse.json({ error: 'Entrada no pertenece a este evento' }, { status: 400 })
    if (!ticketType.event.active) return NextResponse.json({ error: 'Evento no disponible' }, { status: 404 })

    const qty = Math.max(1, parseInt(quantity) || 1)
    const pm: 'CRYPTO' | 'MANUAL' = paymentMethod === 'CRYPTO' ? 'CRYPTO' : 'MANUAL'

    if (pm === 'CRYPTO' && !txHash?.trim()) return NextResponse.json({ error: 'Hash de transacción requerido' }, { status: 400 })
    if (pm === 'MANUAL' && !proofUrl?.trim()) return NextResponse.json({ error: 'Comprobante de pago requerido' }, { status: 400 })

    // Verify txHash not already used
    if (pm === 'CRYPTO') {
      const used = await prisma.ticketOrder.findFirst({ where: { txHash: txHash.trim() } })
      if (used) return NextResponse.json({ error: 'Esta transacción ya fue usada' }, { status: 409 })
    }

    const unitPrice = Number(ticketType.price)
    const totalPrice = unitPrice * qty

    // On-chain verification for CRYPTO
    let finalStatus: 'PENDING' | 'APPROVED' = 'PENDING'
    let blockNumber: bigint | null = null

    if (pm === 'CRYPTO') {
      const verification = await verifyBscTransaction(txHash.trim(), totalPrice)
      if (verification.success) {
        finalStatus = 'APPROVED'
        blockNumber = verification.blockNumber ? BigInt(verification.blockNumber) : null
      }
    }

    // Generate unique ticket code
    let ticketCode = generateTicketCode()
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.ticketOrder.findUnique({ where: { ticketCode } })
      if (!exists) break
      ticketCode = generateTicketCode()
    }

    // Create order in transaction — re-check capacity atomically
    const order = await prisma.$transaction(async (tx) => {
      if (ticketType.capacity != null) {
        const sold = await tx.ticketOrder.aggregate({
          _sum: { quantity: true },
          where: { ticketTypeId: ticketType.id, status: { not: 'REJECTED' } },
        })
        const soldQty = (sold._sum.quantity ?? 0) + qty
        if (soldQty > ticketType.capacity) throw new Error('CAPACITY_EXCEEDED')
      }

      return tx.ticketOrder.create({
        data: {
          eventId: params.eventId,
          ticketTypeId: ticketType.id,
          ticketTypeName: ticketType.name,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          customerPhone: customerPhone.trim(),
          ticketCode,
          quantity: qty,
          unitPrice,
          totalPrice,
          paymentMethod: pm,
          proofUrl: pm === 'MANUAL' ? proofUrl.trim() : null,
          txHash: pm === 'CRYPTO' ? txHash.trim() : null,
          blockNumber,
          status: finalStatus as any,
        },
      })
    }).catch((err: any) => {
      if (err.message === 'CAPACITY_EXCEEDED') return null
      throw err
    })

    if (!order) return NextResponse.json({ error: 'No hay suficientes entradas disponibles para ese tipo' }, { status: 409 })

    // Send ticket email immediately if APPROVED (crypto auto-verified)
    if (finalStatus === 'APPROVED') {
      sendTicketEmail(order.customerEmail, order.customerName, {
        ticketCode: order.ticketCode,
        eventTitle: ticketType.event.title,
        ticketTypeName: ticketType.name,
        eventDate: ticketType.event.date,
        eventLocation: ticketType.event.location,
        eventImage: ticketType.event.image,
        quantity: order.quantity,
        totalPrice: Number(order.totalPrice),
        paymentMethod: pm,
      }).catch(e => console.error('[email] ticket auto:', e))
    }

    return NextResponse.json({
      order: {
        id: order.id,
        ticketCode: order.ticketCode,
        status: finalStatus,
        totalPrice: Number(order.totalPrice),
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/entradas/[eventId]/orders]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

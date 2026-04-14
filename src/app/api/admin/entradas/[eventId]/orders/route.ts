export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/** GET /api/admin/entradas/[eventId]/orders — list ticket orders for an event */
export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')?.trim()

  const tickets = await prisma.ticketOrder.findMany({
    where: {
      eventId: params.eventId,
      ...(status && status !== 'ALL' ? { status: status as any } : {}),
      ...(search ? {
        OR: [
          { ticketCode: { contains: search.toUpperCase() } },
          { customerEmail: { contains: search.toLowerCase() } },
          { customerName: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    tickets: tickets.map(t => ({ ...t, totalPrice: Number(t.totalPrice) })),
  })
}

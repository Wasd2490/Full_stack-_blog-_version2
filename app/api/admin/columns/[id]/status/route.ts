import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, msg: '没有权限' }, { status: 403 })
  }

  const { id } = await params
  const columnId = Number(id)
  if (!Number.isFinite(columnId)) {
    return NextResponse.json({ ok: false, msg: '无效的专栏ID' })
  }

  const body = await req.json()
  const { status } = body

  await prisma.column.update({
    where: { id: columnId },
    data: { status },
  })

  return NextResponse.json({ ok: true })
}

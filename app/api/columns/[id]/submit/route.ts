import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ ok: false, msg: '请先登录' }, { status: 401 })
  }

  const { id } = await params
  const columnId = Number(id)
  if (!Number.isFinite(columnId)) {
    return NextResponse.json({ ok: false, msg: '无效的专栏ID' })
  }

  // 检查是不是自己的专栏
  const column = await prisma.column.findUnique({ where: { id: columnId } })
  if (!column) {
    return NextResponse.json({ ok: false, msg: '专栏不存在' }, { status: 404 })
  }
  if (column.ownerId !== user.id) {
    return NextResponse.json({ ok: false, msg: '只能操作自己的专栏' }, { status: 403 })
  }

  // 提交审核
  await prisma.column.update({
    where: { id: columnId },
    data: { status: 'PENDING' },
  })

  return NextResponse.json({ ok: true })
}

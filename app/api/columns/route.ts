import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ ok: false, msg: '请先登录' }, { status: 401 })
  }

  const body = await req.json()
  const { title, description } = body

  if (!title?.trim()) {
    return NextResponse.json({ ok: false, msg: '专栏标题不能为空' })
  }

  // 生成 slug
  const slug = title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36)

  await prisma.column.create({
    data: {
      title: title.trim(),
      slug,
      description: description?.trim() || null,
      status: 'DRAFT',
      ownerId: user.id,
    },
  })

  return NextResponse.json({ ok: true })
}

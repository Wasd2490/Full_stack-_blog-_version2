import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ ok: false, msg: '请先登录' }, { status: 401 })
  }

  const body = await req.json()
  const { nick, bio, avatar } = body

  if (!nick?.trim()) {
    return NextResponse.json({ ok: false, msg: '昵称不能为空' })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      nick: nick.trim(),
      bio: bio?.trim() || null,
      avatar: avatar?.trim() || null,
    },
  })

  return NextResponse.json({ ok: true })
}

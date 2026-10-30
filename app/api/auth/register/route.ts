import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, createSession } from '@/lib/auth'

export async function POST(req: Request) {
  let body: { email?: string; pwd?: string; nick?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, msg: '请求格式错误' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const pwd = body.pwd ?? ''
  const nick = (body.nick ?? '').trim() || email.split('@')[0]

  if (!email || pwd.length < 6) {
    return NextResponse.json({ ok: false, msg: '邮箱必填，密码至少 6 位' }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (exists) return NextResponse.json({ ok: false, msg: '该邮箱已注册' }, { status: 400 })

  // 第一个注册用户自动成为管理员
  const total = await prisma.user.count()
  const user = await prisma.user.create({
    data: {
      email,
      nick,
      password: hashPassword(pwd),
      role: total === 0 ? 'ADMIN' : 'USER',
    },
  })

  await createSession({ id: user.id, email, nick, avatar: null, role: user.role })
  return NextResponse.json({ ok: true, nick })
}

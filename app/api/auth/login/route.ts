import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, hashPassword, createSession } from '@/lib/auth'

export async function POST(req: Request) {
  let body: { email?: string; pwd?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, msg: '请求格式错误' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const pwd = body.pwd ?? ''
  if (!email || !pwd) return NextResponse.json({ ok: false, msg: '请填写邮箱和密码' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !verifyPassword(pwd, user.password)) {
    return NextResponse.json({ ok: false, msg: '邮箱或密码错误' }, { status: 401 })
  }

  // V1 遗留的 sha256 密码在本次登录成功后升级为 scrypt
  if (!user.password.startsWith('scrypt:')) {
    await prisma.user.update({ where: { id: user.id }, data: { password: hashPassword(pwd) } })
  }

  await createSession({
    id: user.id,
    email: user.email,
    nick: user.nick,
    avatar: user.avatar,
    role: user.role,
  })

  return NextResponse.json({ ok: true, nick: user.nick })
}

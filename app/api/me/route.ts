import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

/** 供客户端组件获取登录态。直接从数据库查最新用户信息，保证昵称头像同步 */
export async function GET() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ ok: false, user: null }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // 从数据库查最新的用户信息
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, nick: true, avatar: true, role: true },
  })

  return NextResponse.json(
    { ok: !!user, user: user ?? null },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

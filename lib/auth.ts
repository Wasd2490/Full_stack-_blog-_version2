// 仅在服务端使用（依赖 next/headers 与 node:crypto）
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { redirect } from 'next/navigation'
import { prisma } from './db'

export const SESSION_COOKIE = 'blog_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 天

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET || 'dev-only-secret-change-me-in-production-32chars'
  return new TextEncoder().encode(s.padEnd(32, '0').slice(0, 64))
}

export type SessionUser = {
  id: number
  email: string
  nick: string
  avatar: string | null
  role: 'USER' | 'ADMIN'
}

// ---------- 密码 ----------
// 新密码：scrypt:iterations:salt:hash；旧库密码：sha256 明文哈希，登录成功后自动升级
export function hashPassword(pwd: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pwd, salt, 64).toString('hex')
  return `scrypt:16384:${salt}:${hash}`
}

function legacySha256(pwd: string): string {
  return createHash('sha256').update(pwd).digest('hex')
}

export function verifyPassword(pwd: string, stored: string): boolean {
  if (!stored) return false
  if (stored.startsWith('scrypt:')) {
    const [, iter, salt, hash] = stored.split(':')
    try {
      const test = scryptSync(pwd, salt, 64, { N: Number(iter) || 16384 })
      const expected = Buffer.from(hash, 'hex')
      return test.length === expected.length && timingSafeEqual(test, expected)
    } catch {
      return false
    }
  }
  // V1 遗留 sha256
  return stored === legacySha256(pwd)
}

// ---------- 会话 ----------
export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret())

  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    if (!payload.id) return null
    return {
      id: Number(payload.id),
      email: String(payload.email ?? ''),
      nick: String(payload.nick ?? ''),
      avatar: (payload.avatar as string | null) ?? null,
      role: (payload.role as 'USER' | 'ADMIN') ?? 'USER',
    }
  } catch {
    return null
  }
}

/** 服务端权限校验：未登录抛错，供 Server Action / Route Handler 使用 */
export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser()
  if (!u) throw new Error('UNAUTHORIZED')
  return u
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser()
  if (u.role !== 'ADMIN') throw new Error('FORBIDDEN')
  return u
}

/** 页面级守卫：未登录跳登录页并保留回跳地址 */
export async function requireAdminPage(returnTo = '/admin'): Promise<SessionUser> {
  const u = await getSessionUser()
  if (!u) redirect(`/login?next=${encodeURIComponent(returnTo)}`)
  if (u.role !== 'ADMIN') redirect('/')
  return u
}

/** 当前登录用户的互动状态（点赞/收藏） */
export async function getMyPostFlags(postId: number) {
  const u = await getSessionUser()
  if (!u) return { liked: false, bookmarked: false }
  const [like, mark] = await Promise.all([
    prisma.like.findUnique({
      where: { userId_postId: { userId: u.id, postId } },
      select: { id: true },
    }),
    prisma.bookmark.findUnique({
      where: { userId_postId: { userId: u.id, postId } },
      select: { id: true },
    }),
  ])
  return { liked: !!like, bookmarked: !!mark }
}

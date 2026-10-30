import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

/**
 * 文章的互动状态（登录态 + 是否点赞/收藏 + 最新点赞数）。
 * 文章详情页是 SSG + ISR，不能在服务端读 cookies，
 * 因此这些「因人而异」的状态由客户端挂载后再取，保证 HTML 可缓存。
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  if (!Number.isFinite(postId)) return NextResponse.json({ ok: false }, { status: 400 })

  const [user, post] = await Promise.all([
    getSessionUser(),
    prisma.post.findUnique({ where: { id: postId }, select: { likeCount: true } }),
  ])

  if (!post) return NextResponse.json({ ok: false, msg: '文章不存在' }, { status: 404 })

  let liked = false
  let bookmarked = false
  if (user) {
    const [l, b] = await Promise.all([
      prisma.like.findUnique({
        where: { userId_postId: { userId: user.id, postId } },
        select: { id: true },
      }),
      prisma.bookmark.findUnique({
        where: { userId_postId: { userId: user.id, postId } },
        select: { id: true },
      }),
    ])
    liked = !!l
    bookmarked = !!b
  }

  return NextResponse.json(
    {
      ok: true,
      loggedIn: !!user,
      user: user ? { id: user.id, nick: user.nick, avatar: user.avatar, role: user.role } : null,
      liked,
      bookmarked,
      likeCount: post.likeCount,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

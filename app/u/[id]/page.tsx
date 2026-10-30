import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { PostCard } from '@/components/PostCard'
import { FollowButton } from '@/components/FollowButton'
import { SubmitColumnButton } from '@/components/SubmitColumnButton'
import { CreateColumnButton } from '@/components/CreateColumnButton'
import { formatDate, siteUrl, DEFAULT_AVATAR } from '@/lib/utils'

export const revalidate = 120

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id: Number(id) }, select: { nick: true, bio: true } })
  if (!user) return { title: '用户不存在' }
  return {
    title: `${user.nick} 的主页`,
    description: user.bio || `${user.nick} 发布的内容`,
    alternates: { canonical: siteUrl(`/u/${id}`) },
  }
}

const PAGE_SIZE = 5

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const userId = Number(id)
  if (!Number.isFinite(userId)) notFound()

  const page = Math.max(1, Number(sp.page || 1))
  const viewer = await getSessionUser()

  const [user, totalPosts, posts, moments, followers, following, columns] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nick: true, avatar: true, bio: true, createdAt: true, role: true },
    }),
    prisma.post.count({ where: { authorId: userId, status: 'PUBLISHED' } }),
    prisma.post.findMany({
      where: { authorId: userId, status: 'PUBLISHED' },
      orderBy: [{ publishedAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, title: true, slug: true, excerpt: true, publishedAt: true,
        viewCount: true, likeCount: true, commentCount: true, wordCount: true,
        category: { select: { name: true, slug: true } },
        tags: { select: { tag: { select: { name: true, slug: true } } } },
      },
    }),
    prisma.moment.count({ where: { authorId: userId } }),
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
    prisma.column.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, slug: true, description: true, cover: true, status: true,
        _count: { select: { posts: true } },
      },
    }),
  ])

  if (!user) notFound()

  const totalPages = Math.ceil(totalPosts / PAGE_SIZE)

  const isFollowing = viewer
    ? !!(await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewer.id, followingId: userId } },
        select: { id: true },
      }))
    : false

  return (
    <div className="container-site" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="card" style={{ padding: 24, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.avatar || DEFAULT_AVATAR}
          alt=""
          style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', background: 'var(--surface-2)' }}
        />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0 }}>
            {user.nick}
            {user.role === 'ADMIN' && <span className="badge" style={{ marginLeft: 8 }}>博主</span>}
          </h1>
          <p className="muted" style={{ margin: '4px 0 6px', fontSize: 14 }}>{user.bio || '这个人很懒，还没写简介'}</p>
          <div className="muted" style={{ fontSize: 13 }}>
            {totalPosts} 篇文章 · {moments} 条动态 · {followers} 粉丝 · 关注 {following} · 加入于 {formatDate(user.createdAt)}
          </div>
        </div>
        {viewer && viewer.id !== user.id && (
          <FollowButton targetId={user.id} initialFollowing={isFollowing} targetNick={user.nick} />
        )}
      </div>

      {/* 我的专栏 */}
      {(columns.length > 0 || viewer?.id === userId) && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>📚 专栏</h2>
          </div>
          {viewer?.id === userId && <CreateColumnButton />}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 28 }}>
            {columns.map((c) => (
              <div key={c.id} className="card" style={{ padding: 16 }}>
                <Link href={`/column/${c.slug}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{c.title}</h3>
                    {c.status === 'PENDING' && <span className="badge badge-warn">待审核</span>}
                    {c.status === 'DRAFT' && <span className="badge">草稿</span>}
                  </div>
                  {c.description && (
                    <p className="muted" style={{ fontSize: 13.5, margin: '0 0 8px', lineHeight: 1.5 }}>
                      {c.description}
                    </p>
                  )}
                  <span className="muted" style={{ fontSize: 12.5 }}>{c._count.posts} 篇文章</span>
                </Link>
                {viewer?.id === userId && (
                  <SubmitColumnButton columnId={c.id} status={c.status} />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>发布的文章</h2>
      <div style={{ display: 'grid', gap: 14 }}>
        {posts.length === 0 && (
          <div className="card" style={{ padding: 36, textAlign: 'center' }}>
            <p className="muted">还没有发布文章</p>
          </div>
        )}
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={{ ...p, tags: p.tags.map((t) => t.tag), author: { nick: user.nick, avatar: user.avatar } }}
            showEdit={viewer?.id === userId}
          />
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24, fontSize: 14 }}>
          {page > 1 && (
            <Link href={`/u/${userId}?page=${page - 1}`} className="btn">上一页</Link>
          )}
          <span className="muted" style={{ alignSelf: 'center' }}>
            第 {page} / {totalPages} 页 · 共 {totalPosts} 篇
          </span>
          {page < totalPages && (
            <Link href={`/u/${userId}?page=${page + 1}`} className="btn">下一页</Link>
          )}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Link href="/moments" className="muted" style={{ fontSize: 13.5 }}>
          查看 TA 的动态 →
        </Link>
      </div>
    </div>
  )
}

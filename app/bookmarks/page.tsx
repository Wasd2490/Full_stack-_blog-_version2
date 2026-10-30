import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: '我的收藏',
  robots: { index: false, follow: false },
}

export default async function BookmarksPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/bookmarks')

  const items = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      post: {
        select: {
          id: true, title: true, slug: true, excerpt: true, publishedAt: true, viewCount: true,
          category: { select: { name: true, slug: true } },
        },
      },
    },
  })

  return (
    <div className="container-site" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>我的收藏 · {items.length}</h1>

      {items.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p className="muted">还没有收藏任何文章</p>
          <Link href="/blog" className="btn" style={{ marginTop: 12 }}>
            去逛逛
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((b) => (
            <article key={b.id} className="card" style={{ padding: 16 }}>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>
                {b.post.category?.name && (
                  <Link href={`/category/${b.post.category.slug}`} className="tag-chip">
                    {b.post.category.name}
                  </Link>
                )}{' '}
                {formatDate(b.post.publishedAt)} · 收藏于 {formatDate(b.createdAt)}
              </div>
              <h2 style={{ fontSize: 16.5, fontWeight: 600 }}>
                <Link href={`/blog/${b.post.slug}`}>{b.post.title}</Link>
              </h2>
              {b.post.excerpt && (
                <p className="muted" style={{ fontSize: 14, margin: '4px 0 0' }}>{b.post.excerpt}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

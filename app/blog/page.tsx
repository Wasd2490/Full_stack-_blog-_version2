import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { PostCard } from '@/components/PostCard'
import { Pager } from '@/components/Pager'
import { BlogSidebar } from '@/components/BlogSidebar'
import { siteUrl } from '@/lib/utils'

export const revalidate = 60

export const metadata: Metadata = {
  title: '全部文章',
  description: '按发布时间与热度浏览全部文章',
  alternates: { canonical: siteUrl('/blog') },
  openGraph: { title: '全部文章', url: siteUrl('/blog') },
}

const PAGE_SIZE = 5

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string; sort?: string }> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page || 1))
  const sort = sp.sort === 'hot' ? 'hot' : 'new'

  const where = { status: 'PUBLISHED' as const }
  const orderBy: any =
    sort === 'hot'
      ? [{ viewCount: 'desc' as const }, { publishedAt: 'desc' as const }]
      : [{ publishedAt: 'desc' as const }, { id: 'desc' as const }]

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, title: true, slug: true, excerpt: true, publishedAt: true,
        viewCount: true, likeCount: true, commentCount: true, wordCount: true, pinned: true,
        category: { select: { name: true, slug: true } },
        author: { select: { nick: true, avatar: true } },
        tags: { select: { tag: { select: { name: true, slug: true } } } },
      },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="container-site" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>全部文章 · {total}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/blog?sort=new" className={`btn ${sort === 'new' ? 'btn-primary' : ''}`}>
            最新
          </Link>
          <Link href="/blog?sort=hot" className={`btn ${sort === 'hot' ? 'btn-primary' : ''}`}>
            最热
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 20, alignItems: 'start' }} className="home-grid">
        <div style={{ display: 'grid', gap: 14 }}>
          {posts.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <p className="muted">暂无文章</p>
            </div>
          )}
          {posts.map((p) => (
            <PostCard key={p.id} post={{ ...p, tags: p.tags.map((t) => t.tag) }} />
          ))}
          <Pager page={page} totalPages={totalPages} basePath="/blog" query={{ sort }} />
        </div>
        <BlogSidebar />
      </div>

      <style>{`@media(max-width:900px){.home-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  )
}

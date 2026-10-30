import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { formatDate, siteUrl } from '@/lib/utils'

export const revalidate = 120

type Params = { slug: string }

export async function generateStaticParams(): Promise<Params[]> {
  const cols = await prisma.column.findMany({ select: { slug: true } })
  return cols.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const col = await prisma.column.findUnique({ where: { slug }, select: { title: true, description: true } })
  if (!col) return { title: '专栏不存在' }
  return {
    title: `${col.title} · 专栏`,
    description: col.description || `${col.title} 专栏目录`,
    alternates: { canonical: siteUrl(`/column/${slug}`) },
  }
}

export default async function ColumnPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const col = await prisma.column.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, nick: true, avatar: true } },
      posts: {
        where: { status: 'PUBLISHED' },
        orderBy: [{ publishedAt: 'asc' }],
        select: { id: true, title: true, slug: true, excerpt: true, publishedAt: true, viewCount: true },
      },
    },
  })
  if (!col) notFound()

  return (
    <div className="container-site" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <nav style={{ fontSize: 13, marginBottom: 10 }} className="muted">
        <Link href="/">首页</Link> / <Link href="/column">专栏</Link>
      </nav>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{col.title}</h1>
        <p className="muted" style={{ margin: '0 0 12px' }}>{col.description || '暂无简介'}</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href={`/u/${col.owner.id}`} className="muted" style={{ fontSize: 13.5 }}>
            {col.owner.nick}
          </Link>
          <span className="muted" style={{ fontSize: 13 }}>共 {col.posts.length} 篇</span>
          <a className="btn" href={`/feed.xml?column=${encodeURIComponent(col.slug)}`}>
            订阅本专栏
          </a>
        </div>
      </div>

      <ol style={{ paddingLeft: 0, listStyle: 'none', margin: 0, display: 'grid', gap: 10 }}>
        {col.posts.length === 0 && (
          <div className="card" style={{ padding: 30, textAlign: 'center' }}>
            <p className="muted">专栏内暂无文章</p>
          </div>
        )}
        {col.posts.map((p, i) => (
          <li key={p.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span className="muted" style={{ fontSize: 15, fontWeight: 700, width: 28 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ flex: 1 }}>
                <Link href={`/blog/${p.slug}`} style={{ fontWeight: 600, fontSize: 16 }}>
                  {p.title}
                </Link>
                {p.excerpt && (
                  <p className="muted" style={{ fontSize: 13.5, margin: '4px 0 0' }}>{p.excerpt}</p>
                )}
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  {formatDate(p.publishedAt)} · {p.viewCount} 阅读
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

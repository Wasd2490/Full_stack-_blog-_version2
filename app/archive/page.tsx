import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatDate, siteUrl } from '@/lib/utils'

export const revalidate = 300

export const metadata: Metadata = {
  title: '归档',
  description: '按年月浏览全部文章的时间线',
  alternates: { canonical: siteUrl('/archive') },
}

type Row = {
  id: number
  title: string
  slug: string
  publishedAt: Date | null
  viewCount: number
}

export default async function ArchivePage() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ publishedAt: 'desc' }],
    select: { id: true, title: true, slug: true, publishedAt: true, viewCount: true },
  })

  const groups = new Map<string, Row[]>()
  for (const p of posts) {
    const d = p.publishedAt ?? new Date()
    const key = `${d.getFullYear()} 年 ${String(d.getMonth() + 1).padStart(2, '0')} 月`
    const arr = groups.get(key) ?? []
    arr.push(p)
    groups.set(key, arr)
  }

  return (
    <div className="container-site" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>归档</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        共 {posts.length} 篇文章，按发布时间倒序排列
      </p>

      {groups.size === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p className="muted">暂无文章</p>
        </div>
      )}

      {[...groups.entries()].map(([key, list]) => (
        <section key={key} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, paddingLeft: 10, borderLeft: '3px solid var(--brand)' }}>
            {key} · {list.length} 篇
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {list.map((p) => (
              <li key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: 14.5 }}>
                <span className="muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap', width: 84 }}>
                  {formatDate(p.publishedAt)}
                </span>
                <Link href={`/blog/${p.slug}`} style={{ flex: 1 }}>
                  {p.title}
                </Link>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {p.viewCount} 阅读
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

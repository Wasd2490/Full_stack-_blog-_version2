import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { siteUrl, formatDate } from '@/lib/utils'

export const revalidate = 300

export const metadata: Metadata = {
  title: '专栏',
  description: '按主题组织的系列文章合集',
  alternates: { canonical: siteUrl('/column') },
}

export default async function ColumnListPage() {
  const columns = await prisma.column.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, slug: true, description: true, cover: true,
      owner: { select: { nick: true } },
      _count: { select: { posts: true } },
    },
  })

  return (
    <div className="container-site" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>专栏</h1>

      {columns.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p className="muted">还没有创建专栏，可在管理后台把系列文章整理成专栏。</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {columns.map((c) => (
            <Link key={c.id} href={`/column/${c.slug}`} className="card" style={{ padding: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{c.title}</h2>
              <p className="muted" style={{ fontSize: 14, margin: '0 0 10px' }}>
                {c.description || '暂无简介'}
              </p>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {c.owner.nick} · {c._count.posts} 篇
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

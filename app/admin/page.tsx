import Link from 'next/link'
import { prisma } from '@/lib/db'
import { flushScheduledPosts } from '@/lib/admin'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  await flushScheduledPosts()

  const [postCount, published, draft, commentCount, pending, userCount, momentCount, topPosts] =
    await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.post.count({ where: { status: 'DRAFT' } }),
      prisma.comment.count({ where: { deletedAt: null } }),
      prisma.comment.count({ where: { status: 'PENDING', deletedAt: null } }),
      prisma.user.count(),
      prisma.moment.count(),
      prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, title: true, slug: true, viewCount: true, likeCount: true, commentCount: true },
      }),
    ])

  const cards = [
    { label: '文章总数', value: postCount, href: '/admin/posts' },
    { label: '已发布', value: published, href: '/admin/posts?status=PUBLISHED' },
    { label: '草稿', value: draft, href: '/admin/posts?status=DRAFT' },
    { label: '评论', value: commentCount, href: '/admin/comments' },
    { label: '待审核', value: pending, href: '/admin/comments?status=PENDING', warn: pending > 0 },
    { label: '用户', value: userCount, href: '#' },
    { label: '动态', value: momentCount, href: '/admin/moments' },
  ]

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card" style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 13 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.warn ? '#b45309' : undefined }}>{c.value}</div>
          </Link>
        ))}
      </div>

      <section className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>阅读量 TOP 5</h2>
        {topPosts.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>暂无数据</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6, fontSize: 14 }}>
            {topPosts.map((p) => (
              <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                <span className="muted" style={{ whiteSpace: 'nowrap' }}>
                  {p.viewCount} 阅读 · {p.likeCount} 赞 · {p.commentCount} 评
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/admin/posts/new" className="btn btn-primary">
          写新文章
        </Link>
        <a href="/feed.xml" className="btn" target="_blank">
          查看 RSS
        </a>
        <a href="/sitemap.xml" className="btn" target="_blank">
          查看 Sitemap
        </a>
      </div>

      <p className="muted" style={{ fontSize: 12.5 }}>
        数据更新于 {formatDate(new Date(), 'datetime')}
      </p>
    </div>
  )
}

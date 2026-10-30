import Link from 'next/link'
import { prisma } from '@/lib/db'

/** 侧栏：分类 / 标签云 / 热门文章。Server Component，随页面直出利于 SEO */
export async function BlogSidebar() {
  const [categories, tags, hot] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, _count: { select: { posts: true } } },
    }),
    prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, _count: { select: { posts: true } } },
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
      take: 5,
      select: { id: true, title: true, slug: true, viewCount: true },
    }),
  ])

  const withPosts = tags.filter((t) => t._count.posts > 0)
  const max = Math.max(1, ...withPosts.map((t) => t._count.posts))

  return (
    <aside style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
      <section className="card" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>分类</h3>
        {categories.length === 0 && <p className="muted" style={{ fontSize: 13 }}>暂无分类</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }}>
          {categories.map((c) => (
            <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <Link href={`/category/${c.slug}`} className="muted" style={{ flex: 1 }}>
                {c.name}
              </Link>
              <span className="muted">{c._count.posts}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>标签云</h3>
        {withPosts.length === 0 && <p className="muted" style={{ fontSize: 13 }}>暂无标签</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {withPosts.map((t) => {
            const ratio = t._count.posts / max
            const size = 12 + Math.round(ratio * 8)
            return (
              <Link
                key={t.id}
                href={`/tag/${t.slug}`}
                className="tag-chip"
                style={{ fontSize: size, opacity: 0.55 + ratio * 0.45 }}
              >
                {t.name}
              </Link>
            )
          })}
        </div>
      </section>

      <section className="card" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>热门文章</h3>
        <ol style={{ paddingLeft: 18, margin: 0, display: 'grid', gap: 8, fontSize: 14 }}>
          {hot.map((p) => (
            <li key={p.id}>
              <Link href={`/blog/${p.slug}`} className="muted">
                {p.title}
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  )
}

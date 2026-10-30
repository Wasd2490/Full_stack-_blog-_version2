import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { searchPosts } from '@/lib/search'
import { Pager } from '@/components/Pager'
import { formatDate, siteUrl } from '@/lib/utils'

export const metadata: Metadata = {
  title: '搜索',
  description: '站内全文搜索，支持标题、正文与标签检索',
  robots: { index: false, follow: true },
}

const PAGE_SIZE = 10

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string; tag?: string }>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const page = Math.max(1, Number(sp.page || 1))

  const [categories, tags] = await Promise.all([
    prisma.category.findMany({ select: { name: true, slug: true }, orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ select: { name: true, slug: true }, orderBy: { name: 'asc' }, take: 30 }),
  ])

  const { results, total } = q
    ? await searchPosts({ q, categorySlug: sp.category, tagSlug: sp.tag, page, pageSize: PAGE_SIZE })
    : { results: [], total: 0 }

  const buildHref = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    Object.entries(extra).forEach(([k, v]) => v && params.set(k, v))
    return `/search?${params.toString()}`
  }

  return (
    <div className="container-site" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>站内搜索</h1>

      <form action="/search" method="get" style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          className="input"
          name="q"
          defaultValue={q}
          placeholder="输入关键词，支持中文与英文…"
          style={{ maxWidth: 420 }}
          aria-label="搜索关键词"
        />
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
        {sp.tag && <input type="hidden" name="tag" value={sp.tag} />}
        <button className="btn btn-primary" type="submit">
          搜索
        </button>
      </form>

      {/* 过滤器 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, fontSize: 13 }}>
        <Link href={buildHref({})} className={`tag-chip ${!sp.category && !sp.tag ? 'active' : ''}`}>
          全部
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={buildHref({ category: c.slug })}
            className="tag-chip"
            style={sp.category === c.slug ? { color: 'var(--brand)', borderColor: 'var(--brand)' } : undefined}
          >
            {c.name}
          </Link>
        ))}
        {tags.map((t) => (
          <Link
            key={t.slug}
            href={buildHref({ tag: t.slug })}
            className="tag-chip"
            style={sp.tag === t.slug ? { color: 'var(--brand)', borderColor: 'var(--brand)' } : undefined}
          >
            #{t.name}
          </Link>
        ))}
      </div>

      {q && (
        <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>
          「{q}」共找到 {total} 条结果
          {sp.category && ` · 分类：${sp.category}`}
          {sp.tag && ` · 标签：${sp.tag}`}
        </p>
      )}

      {!q && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p className="muted">输入关键词开始搜索</p>
        </div>
      )}

      {q && results.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p className="muted">没有找到匹配的文章，换个关键词试试</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {results.map((r) => (
          <article key={r.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, marginBottom: 4 }}>
              {r.categoryName && (
                <Link href={`/category/${r.categorySlug}`} className="tag-chip">
                  {r.categoryName}
                </Link>
              )}
              <span className="muted">{formatDate(r.publishedAt)}</span>
              <span className="muted">· {r.viewCount} 阅读</span>
            </div>
            <h2 style={{ fontSize: 16.5, fontWeight: 600, margin: '4px 0 6px' }}>
              <Link href={`/blog/${r.slug}`}>{r.title}</Link>
            </h2>
            <p
              className="muted"
              style={{ fontSize: 14, margin: 0, lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: r.highlight }}
            />
          </article>
        ))}
      </div>

      <Pager
        page={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        basePath="/search"
        query={{ q, category: sp.category, tag: sp.tag }}
      />
    </div>
  )
}

import { Prisma } from '@prisma/client'
import { prisma } from './db'

export type SearchResult = {
  id: number
  title: string
  slug: string
  excerpt: string | null
  publishedAt: Date | null
  viewCount: number
  categoryName: string | null
  categorySlug: string | null
  rank: number
  highlight: string
}

/**
 * 全文搜索策略：
 *  1. tsvector（英文/数字/代码）—— 走 GIN 索引，支持 ts_rank 排序与 ts_headline 高亮
 *  2. ILIKE（中文）—— PostgreSQL 默认无中文分词器，中文子串用 ILIKE + pg_trgm 索引兜底
 * 两者取并集，保证中英文查询都有结果。
 */
export async function searchPosts(opts: {
  q: string
  categorySlug?: string
  tagSlug?: string
  page?: number
  pageSize?: number
}): Promise<{ results: SearchResult[]; total: number }> {
  const { q, categorySlug, tagSlug } = opts
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(50, Math.max(5, opts.pageSize ?? 10))
  const offset = (page - 1) * pageSize

  const keyword = q.trim()
  if (!keyword) return { results: [], total: 0 }

  const likePattern = `%${keyword}%`
  const conditions: Prisma.Sql[] = [
    Prisma.sql`p.status = 'PUBLISHED'`,
    Prisma.sql`(
      p."searchVector" @@ websearch_to_tsquery('simple', ${keyword})
      OR p.title ILIKE ${likePattern}
      OR p.content ILIKE ${likePattern}
      OR p.excerpt ILIKE ${likePattern}
    )`,
  ]

  if (categorySlug) {
    conditions.push(Prisma.sql`c.slug = ${categorySlug}`)
  }
  if (tagSlug) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "PostTag" pt JOIN "Tag" t ON t.id = pt."tagId" WHERE pt."postId" = p.id AND t.slug = ${tagSlug})`
    )
  }

  const where = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`

  const rows = await prisma.$queryRaw<
    Array<{
      id: number
      title: string
      slug: string
      excerpt: string | null
      content: string
      publishedAt: Date | null
      viewCount: number
      categoryName: string | null
      categorySlug: string | null
      rank: number
      headline: string | null
    }>
  >(Prisma.sql`
    SELECT
      p.id, p.title, p.slug, p.excerpt, p.content, p."publishedAt", p."viewCount",
      c.name AS "categoryName", c.slug AS "categorySlug",
      ts_rank(p."searchVector", websearch_to_tsquery('simple', ${keyword}))::float8 AS rank,
      CASE
        WHEN p."searchVector" @@ websearch_to_tsquery('simple', ${keyword})
        THEN ts_headline('simple', p.content, websearch_to_tsquery('simple', ${keyword}),
             'MaxFragments=2, MinWords=10, MaxWords=40, StartSel=<mark>, StopSel=</mark>')
        ELSE NULL
      END AS headline
    FROM "Post" p
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    ${where}
    ORDER BY rank DESC, p."publishedAt" DESC NULLS LAST
    LIMIT ${pageSize} OFFSET ${offset}
  `)

  const countRows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM "Post" p
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    ${where}
  `)

  const results: SearchResult[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    publishedAt: r.publishedAt,
    viewCount: r.viewCount,
    categoryName: r.categoryName,
    categorySlug: r.categorySlug,
    rank: Number(r.rank ?? 0),
    highlight: r.headline && r.headline.includes('<mark>')
      ? r.headline
      : snippetAround(r.content, keyword),
  }))

  return { results, total: Number(countRows[0]?.count ?? 0) }
}

/** 中文/未命中 ts_headline 时，手工截取关键词周边片段 */
function snippetAround(content: string, keyword: string, radius = 80): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const idx = plain.toLowerCase().indexOf(keyword.toLowerCase())
  const start = idx > -1 ? Math.max(0, idx - radius) : 0
  const end = idx > -1 ? Math.min(plain.length, idx + keyword.length + radius) : Math.min(plain.length, radius * 2)
  const cut = (start > 0 ? '…' : '') + plain.slice(start, end) + (end < plain.length ? '…' : '')
  return highlightHtml(cut, keyword)
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** 在已转义的文本上包裹 <mark>，中文查询也能高亮 */
export function highlightHtml(text: string, keyword: string): string {
  const terms = keyword.split(/\s+/).map((t) => t.trim()).filter(Boolean)
  let out = escapeHtml(text)
  for (const term of terms) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    out = out.replace(re, (m) => `<mark class="hl">${m}</mark>`)
  }
  return out
}

/** 新建/更新文章后同步搜索向量（生成列由数据库维护，这里只做显式刷新兜底） */
export async function refreshSearchVector(postId: number): Promise<void> {
  await prisma.$executeRaw`UPDATE "Post" SET "updatedAt" = NOW() WHERE id = ${postId}`
}

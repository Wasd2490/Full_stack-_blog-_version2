import { prisma } from '@/lib/db'
import { siteUrl } from '@/lib/utils'
import { escapeHtml } from '@/lib/search'

export const revalidate = 600

function esc(s: string): string {
  return escapeHtml(s ?? '')
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const columnSlug = url.searchParams.get('column')

  const posts = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      ...(columnSlug ? { column: { slug: columnSlug } } : {}),
    },
    orderBy: [{ publishedAt: 'desc' }],
    take: 50,
    select: {
      id: true, title: true, slug: true, excerpt: true, content: true,
      publishedAt: true, updatedAt: true,
      author: { select: { nick: true } },
      category: { select: { name: true } },
      column: { select: { title: true, slug: true } },
    },
  })

  const siteName = process.env.SITE_NAME || 'characteristic·博客'
  const desc = process.env.SITE_DESCRIPTION || '在星空下持续写作'
  const base = siteUrl()
  const self = columnSlug ? siteUrl(`/feed.xml?column=${encodeURIComponent(columnSlug)}`) : siteUrl('/feed.xml')

  const items = posts
    .map((p) => {
      const link = siteUrl(`/blog/${p.slug}`)
      const pub = (p.publishedAt ?? p.updatedAt).toUTCString()
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pub}</pubDate>
      <dc:creator><![CDATA[${p.author?.nick ?? '匿名'}]]></dc:creator>
      ${p.category ? `<category><![CDATA[${p.category.name}]]></category>` : ''}
      <description><![CDATA[${p.excerpt || p.content.slice(0, 200)}]]></description>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(siteName)}</title>
    <link>${base}</link>
    <description>${esc(desc)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
    },
  })
}

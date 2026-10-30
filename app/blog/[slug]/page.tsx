import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { MarkdownView } from '@/components/MarkdownView'
import { Toc } from '@/components/Toc'
import { PostActions } from '@/components/PostActions'
import { ViewCounter } from '@/components/ViewCounter'
import { CommentSection, type CommentNode } from '@/components/CommentSection'
import { extractToc } from '@/lib/toc'
import { formatDate, siteUrl, readingTime, DEFAULT_AVATAR } from '@/lib/utils'

export const revalidate = 60

type Params = { slug: string }

export async function generateStaticParams(): Promise<Params[]> {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true },
    orderBy: { publishedAt: 'desc' },
    take: 100,
  })
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.post.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      title: true, excerpt: true, publishedAt: true, updatedAt: true, cover: true,
      author: { select: { nick: true } },
      category: { select: { name: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  })
  if (!post) return { title: '文章不存在' }

  const tags = post.tags.map((t) => t.tag.name)
  const url = siteUrl(`/blog/${slug}`)

  return {
    title: post.title,
    description: post.excerpt || post.title,
    keywords: tags,
    authors: [{ name: post.author?.nick ?? '匿名' }],
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt || '',
      url,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author?.nick ?? '匿名'],
      section: post.category?.name,
      tags,
      images: post.cover ? [post.cover] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || '',
      images: post.cover ? [post.cover] : undefined,
    },
  }
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params

  // 本页刻意不读 cookies：评论列表只取已通过的（利于 SEO 与缓存），
  // 登录态 / 点赞状态由客户端组件另行请求，从而让整页可以 SSG + ISR。
  const post = await prisma.post.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      author: { select: { id: true, nick: true, avatar: true, bio: true } },
      category: { select: { name: true, slug: true } },
      column: { select: { title: true, slug: true } },
      tags: { select: { tag: { select: { name: true, slug: true } } } },
      _count: { select: { likes: true, bookmarks: true } },
    },
  })

  if (!post) notFound()

  const tagNames = post.tags.map((t) => t.tag.name)

  const [prev, next, related, commentRows] = await Promise.all([
    prisma.post.findFirst({
      where: { status: 'PUBLISHED', publishedAt: { lt: post.publishedAt ?? new Date() } },
      orderBy: { publishedAt: 'desc' },
      select: { title: true, slug: true },
    }),
    prisma.post.findFirst({
      where: { status: 'PUBLISHED', publishedAt: { gt: post.publishedAt ?? new Date() } },
      orderBy: { publishedAt: 'asc' },
      select: { title: true, slug: true },
    }),
    prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: post.id },
        OR: [
          ...(tagNames.length
            ? [{ tags: { some: { tag: { name: { in: tagNames } } } } }]
            : []),
          ...(post.categoryId ? [{ categoryId: post.categoryId }] : []),
        ],
      },
      orderBy: [{ publishedAt: 'desc' }],
      take: 5,
      select: { id: true, title: true, slug: true, publishedAt: true },
    }),
    prisma.comment.findMany({
      where: { postId: post.id, deletedAt: null, status: 'APPROVED' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, content: true, depth: true, parentId: true,
        authorId: true, createdAt: true,
        author: { select: { id: true, nick: true, avatar: true } },
      },
    }),
  ])

  // 构建评论树（最多 3 层已在写入侧限制）
  const nodes = new Map<number, CommentNode>()
  for (const r of commentRows) {
    nodes.set(r.id, {
      id: r.id,
      content: r.content,
      depth: r.depth,
      createdAt: r.createdAt.toISOString(),
      authorId: r.authorId,
      author: r.author
        ? { id: r.author.id, nick: r.author.nick, avatar: r.author.avatar }
        : { id: null, nick: '访客', avatar: null },
      replies: [],
    })
  }
  const roots: CommentNode[] = []
  for (const r of commentRows) {
    const node = nodes.get(r.id)!
    const parent = r.parentId ? nodes.get(r.parentId) : undefined
    if (parent) parent.replies.push(node)
    else roots.push(node)
  }

  const toc = extractToc(post.content)
  const url = siteUrl(`/blog/${post.slug}`)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || '',
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    wordCount: post.wordCount,
    keywords: tagNames.join(', ') || undefined,
    articleSection: post.category?.name,
    author: {
      '@type': 'Person',
      name: post.author?.nick ?? '匿名',
    },
    publisher: {
      '@type': 'Organization',
      name: process.env.SITE_NAME || '谁暖了冬季',
    },
    image: post.cover ? [post.cover] : undefined,
  }

  return (
    <div className="container-site" style={{ paddingTop: 20, paddingBottom: 40 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ViewCounter postId={post.id} />

      {/* 面包屑 */}
      <nav style={{ fontSize: 13, marginBottom: 12 }} className="muted">
        <Link href="/">首页</Link> / <Link href="/blog">文章</Link>
        {post.category && (
          <>
            {' '}
            / <Link href={`/category/${post.category.slug}`}>{post.category.name}</Link>
          </>
        )}
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: toc.length > 1 ? 'minmax(0,1fr) 210px' : 'minmax(0,1fr)', gap: 20, alignItems: 'start' }} className="post-grid">
        <article className="card" style={{ padding: '28px 30px' }}>
          <h1 style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.35, marginBottom: 10 }}>{post.title}</h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13.5, paddingBottom: 14, borderBottom: '1px solid var(--border)' }} className="muted">
            <span>{post.author?.nick ?? '匿名'}</span>
            <span>{formatDate(post.publishedAt)}</span>
            <span>👁 {post.viewCount} 阅读</span>
            <span>约 {readingTime(post.wordCount)} 分钟</span>
            {post.category && (
              <Link href={`/category/${post.category.slug}`} className="tag-chip">
                {post.category.name}
              </Link>
            )}
            {post.column && (
              <Link href={`/column/${post.column.slug}`} className="tag-chip">
                专栏：{post.column.title}
              </Link>
            )}
          </div>

          <div style={{ marginTop: 6 }}>
            <MarkdownView content={post.content} />
          </div>

          {tagNames.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 28, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              {post.tags.map((t) => (
                <Link key={t.tag.slug} href={`/tag/${t.tag.slug}`} className="tag-chip">
                  #{t.tag.name}
                </Link>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <PostActions postId={post.id} likeCount={post.likeCount} />
          </div>

          {/* 作者卡片 */}
          {post.author && (
            <div className="card" style={{ padding: 16, marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.author.avatar || DEFAULT_AVATAR}
                alt=""
                style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', background: 'var(--surface-2)' }}
              />
              <div style={{ flex: 1 }}>
                <Link href={`/u/${post.author.id}`} style={{ fontWeight: 600 }}>
                  {post.author.nick}
                </Link>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>{post.author.bio || '这个人很懒，还没写简介'}</p>
              </div>
            </div>
          )}

          {/* 上一篇 / 下一篇 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16, fontSize: 14 }}>
            {prev ? (
              <Link href={`/blog/${prev.slug}`} className="card" style={{ padding: 12 }}>
                <span className="muted" style={{ fontSize: 12 }}>上一篇</span>
                <div>{prev.title}</div>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/blog/${next.slug}`} className="card" style={{ padding: 12, textAlign: 'right' }}>
                <span className="muted" style={{ fontSize: 12 }}>下一篇</span>
                <div>{next.title}</div>
              </Link>
            )}
          </div>
        </article>

        {toc.length > 1 && <Toc items={toc} />}
      </div>

      {related.length > 0 && (
        <section className="card" style={{ padding: 18, marginTop: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>相关文章</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8, fontSize: 14 }}>
            {related.map((r) => (
              <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <Link href={`/blog/${r.slug}`}>{r.title}</Link>
                <span className="muted" style={{ whiteSpace: 'nowrap' }}>{formatDate(r.publishedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CommentSection postId={post.id} comments={roots} />

      <style>{`@media(max-width:1000px){.post-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  )
}

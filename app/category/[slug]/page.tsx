import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { PostCard } from '@/components/PostCard'
import { Pager } from '@/components/Pager'
import { siteUrl } from '@/lib/utils'

export const revalidate = 60
const PAGE_SIZE = 10

type Params = { slug: string }

export async function generateStaticParams(): Promise<Params[]> {
  const cats = await prisma.category.findMany({ select: { slug: true } })
  return cats.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const cat = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, description: true },
  })
  if (!cat) return { title: '分类不存在' }
  return {
    title: `${cat.name} · 分类`,
    description: cat.description || `${cat.name} 分类下的全部文章`,
    alternates: { canonical: siteUrl(`/category/${slug}`) },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page || 1))

  const cat = await prisma.category.findUnique({ where: { slug } })
  if (!cat) notFound()

  const [total, posts] = await Promise.all([
    prisma.post.count({ where: { status: 'PUBLISHED', categoryId: cat.id } }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED', categoryId: cat.id },
      orderBy: [{ publishedAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, title: true, slug: true, excerpt: true, publishedAt: true,
        viewCount: true, likeCount: true, commentCount: true, wordCount: true,
        category: { select: { name: true, slug: true } },
        author: { select: { nick: true, avatar: true } },
        tags: { select: { tag: { select: { name: true, slug: true } } } },
      },
    }),
  ])

  return (
    <div className="container-site" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <nav style={{ fontSize: 13, marginBottom: 10 }} className="muted">
        <Link href="/">首页</Link> / <Link href="/blog">文章</Link> / {cat.name}
      </nav>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
        {cat.name} · {total} 篇
      </h1>
      {cat.description && <p className="muted" style={{ marginBottom: 18 }}>{cat.description}</p>}

      <div style={{ display: 'grid', gap: 14 }}>
        {posts.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <p className="muted">该分类下暂无文章</p>
          </div>
        )}
        {posts.map((p) => (
          <PostCard key={p.id} post={{ ...p, tags: p.tags.map((t) => t.tag) }} />
        ))}
        <Pager page={page} totalPages={Math.ceil(total / PAGE_SIZE)} basePath={`/category/${slug}`} />
      </div>
    </div>
  )
}

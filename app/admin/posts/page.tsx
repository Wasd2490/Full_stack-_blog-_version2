import { prisma } from '@/lib/db'
import { AdminPostList } from '@/components/AdminPostList'

export const dynamic = 'force-dynamic'

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string; page?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page || 1))
  const PAGE_SIZE = 20

  const where: any = {}
  if (sp.status && sp.status !== 'ALL') where.status = sp.status
  if (sp.category) where.categoryId = Number(sp.category)
  if (sp.q?.trim()) {
    where.OR = [
      { title: { contains: sp.q.trim(), mode: 'insensitive' } },
      { content: { contains: sp.q.trim(), mode: 'insensitive' } },
    ]
  }

  const [posts, total, categories] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, title: true, slug: true, status: true, pinned: true,
        viewCount: true, likeCount: true, commentCount: true,
        publishedAt: true, scheduledAt: true, updatedAt: true,
        category: { select: { name: true } },
      },
    }),
    prisma.post.count({ where }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <AdminPostList
      posts={posts.map((p) => ({
        ...p,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        scheduledAt: p.scheduledAt?.toISOString() ?? null,
        updatedAt: p.updatedAt.toISOString(),
        categoryName: p.category?.name ?? null,
      }))}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      categories={categories}
      filters={{ status: sp.status ?? 'ALL', category: sp.category ?? '', q: sp.q ?? '' }}
    />
  )
}

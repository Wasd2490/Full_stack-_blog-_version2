import { prisma } from '@/lib/db'
import { AdminCommentList } from '@/components/AdminCommentList'

export const dynamic = 'force-dynamic'

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const status = sp.status ?? 'PENDING'

  const where: any = { deletedAt: null }
  if (status !== 'ALL') where.status = status

  const [comments, counts] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, content: true, status: true, depth: true, createdAt: true,
        author: { select: { nick: true, avatar: true } },
        post: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.comment.groupBy({ by: ['status'], where: { deletedAt: null }, _count: true }),
  ])

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]))

  return (
    <AdminCommentList
      comments={comments.map((c) => ({
        id: c.id,
        content: c.content,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        authorNick: c.author?.nick ?? '访客',
        postTitle: c.post?.title ?? '（动态）',
        postSlug: c.post?.slug ?? null,
      }))}
      status={status}
      counts={{
        PENDING: countMap.PENDING ?? 0,
        APPROVED: countMap.APPROVED ?? 0,
        REJECTED: countMap.REJECTED ?? 0,
      }}
    />
  )
}

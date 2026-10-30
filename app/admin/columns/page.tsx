import { prisma } from '@/lib/db'
import { AdminColumnManager } from '@/components/AdminColumnManager'

export const dynamic = 'force-dynamic'

export default async function AdminColumnsPage() {
  const cols = await prisma.column.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, slug: true, description: true, status: true,
      owner: { select: { nick: true } },
      _count: { select: { posts: true } },
    },
  })

  return (
    <AdminColumnManager
      columns={cols.map((c) => ({
        ...c,
        count: c._count.posts,
        ownerNick: c.owner.nick,
      }))}
    />
  )
}

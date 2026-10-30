import { prisma } from '@/lib/db'
import { AdminTaxonomy } from '@/components/AdminTaxonomy'

export const dynamic = 'force-dynamic'

export default async function AdminTagsPage() {
  const rows = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, _count: { select: { posts: true } } },
  })

  return (
    <AdminTaxonomy
      kind="tag"
      rows={rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, count: r._count.posts }))}
    />
  )
}

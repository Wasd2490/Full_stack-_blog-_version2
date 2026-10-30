import { prisma } from '@/lib/db'
import { AdminTaxonomy } from '@/components/AdminTaxonomy'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const rows = await prisma.category.findMany({
    orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, description: true, _count: { select: { posts: true } } },
  })

  return (
    <AdminTaxonomy
      kind="category"
      rows={rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        count: r._count.posts,
      }))}
    />
  )
}

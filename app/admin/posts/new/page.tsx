import { prisma } from '@/lib/db'
import { PostEditor } from '@/components/PostEditor'

export const dynamic = 'force-dynamic'

export default async function NewPostPage() {
  const [categories, columns, tags] = await Promise.all([
    prisma.category.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
    prisma.column.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    prisma.tag.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <PostEditor
      post={{
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        cover: '',
        categoryName: '',
        tags: [],
        status: 'DRAFT',
        scheduledAt: '',
        pinned: false,
        columnId: null,
      }}
      categories={categories.map((c) => c.name)}
      columns={columns}
      allTags={tags.map((t) => t.name)}
    />
  )
}

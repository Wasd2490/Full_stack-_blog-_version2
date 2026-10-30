import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { PostEditor } from '@/components/PostEditor'

export const dynamic = 'force-dynamic'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  if (!Number.isFinite(postId)) notFound()

  const [post, categories, columns, allTags] = await Promise.all([
    prisma.post.findUnique({
      where: { id: postId },
      include: {
        category: { select: { name: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    }),
    prisma.category.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
    prisma.column.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    prisma.tag.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
  ])

  if (!post) notFound()

  return (
    <PostEditor
      post={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt ?? '',
        cover: post.cover ?? '',
        categoryName: post.category?.name ?? '',
        tags: post.tags.map((t) => t.tag.name),
        status: post.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
        scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString().slice(0, 16) : '',
        pinned: post.pinned,
        columnId: post.columnId,
      }}
      categories={categories.map((c) => c.name)}
      columns={columns}
      allTags={allTags.map((t) => t.name)}
    />
  )
}

import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'
import { siteUrl } from '@/lib/utils'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()

  const [posts, categories, tags, columns] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.tag.findMany({ select: { slug: true } }),
    prisma.column.findMany({ select: { slug: true, updatedAt: true } }),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: siteUrl('/blog'), lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: siteUrl('/archive'), lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: siteUrl('/column'), lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: siteUrl('/moments'), lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: siteUrl('/album'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  return [
    ...staticRoutes,
    ...posts.map((p) => ({
      url: siteUrl(`/blog/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({
      url: siteUrl(`/category/${c.slug}`),
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    ...tags.map((t) => ({
      url: siteUrl(`/tag/${t.slug}`),
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    })),
    ...columns.map((c) => ({
      url: siteUrl(`/column/${c.slug}`),
      lastModified: c.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]
}

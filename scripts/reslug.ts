/**
 * 把库里已有的 slug 重新生成一遍（用于切换 slug 规则，例如「中文 slug」改为「拼音 slug」）。
 * 用法：npx tsx scripts/reslug.ts
 *
 * 注意：旧 slug 会失效，若已对外发布过链接，需要自行配置 301 重定向。
 */
import { PrismaClient } from '@prisma/client'
import { slugify } from '../lib/utils'

const prisma = new PrismaClient()

async function main() {
  const taken = new Set<string>()

  const posts = await prisma.post.findMany({ select: { id: true, title: true, slug: true }, orderBy: { id: 'asc' } })
  for (const p of posts) {
    let base = slugify(p.title, `post-${p.id}`)
    let slug = base
    let i = 2
    while (taken.has(slug)) slug = `${base}-${i++}`
    taken.add(slug)
    if (slug !== p.slug) {
      await prisma.post.update({ where: { id: p.id }, data: { slug } })
      console.log(`post #${p.id}: ${p.slug} -> ${slug}`)
    }
  }

  const cats = await prisma.category.findMany({ select: { id: true, name: true, slug: true } })
  const catTaken = new Set<string>()
  for (const c of cats) {
    let base = slugify(c.name, `cat-${c.id}`)
    let slug = base
    let i = 2
    while (catTaken.has(slug)) slug = `${base}-${i++}`
    catTaken.add(slug)
    if (slug !== c.slug) {
      await prisma.category.update({ where: { id: c.id }, data: { slug } })
      console.log(`category #${c.id}: ${c.slug} -> ${slug}`)
    }
  }

  const tags = await prisma.tag.findMany({ select: { id: true, name: true, slug: true } })
  const tagTaken = new Set<string>()
  for (const t of tags) {
    let base = slugify(t.name, `tag-${t.id}`)
    let slug = base
    let i = 2
    while (tagTaken.has(slug)) slug = `${base}-${i++}`
    tagTaken.add(slug)
    if (slug !== t.slug) {
      await prisma.tag.update({ where: { id: t.id }, data: { slug } })
      console.log(`tag #${t.id}: ${t.slug} -> ${slug}`)
    }
  }

  console.log('[✓] slug 重建完成')
}

main()
  .catch((e) => {
    console.error('[x] 失败：', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

#!/usr/bin/env node
/**
 * 建立搜索加速索引（可选，可重复执行）
 *
 *   npm run db:search-index
 *
 * 背景：搜索查询走运行时 tsvector 表达式，不依赖任何 schema 之外的对象，
 * 因此即使索引不存在功能也正常。本脚本只是加索引让大数量级下更快。
 *
 * 注意：执行 `prisma db push` / `migrate dev` 会清掉这些索引（它们不在 schema 里），
 * 届时重跑本脚本即可，不会造成故障。
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const STEPS = [
  ['pg_trgm 扩展', `CREATE EXTENSION IF NOT EXISTS pg_trgm`],
  [
    'tsvector 表达式索引（GIN）',
    `CREATE INDEX IF NOT EXISTS "Post_tsvector_expr_idx" ON "Post" USING GIN ((
       setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
       setweight(to_tsvector('simple', coalesce("excerpt", '')), 'B') ||
       setweight(to_tsvector('simple', coalesce("content", '')), 'C')
     ))`,
  ],
  [
    '标题 trigram 索引（中文子串）',
    `CREATE INDEX IF NOT EXISTS "Post_title_trgm_idx" ON "Post" USING GIN ("title" gin_trgm_ops)`,
  ],
  [
    '正文 trigram 索引（中文子串）',
    `CREATE INDEX IF NOT EXISTS "Post_content_trgm_idx" ON "Post" USING GIN ("content" gin_trgm_ops)`,
  ],
  [
    '摘要 trigram 索引',
    `CREATE INDEX IF NOT EXISTS "Post_excerpt_trgm_idx" ON "Post" USING GIN ("excerpt" gin_trgm_ops)`,
  ],
]

async function main() {
  console.log('\n=== 建立搜索索引 ===\n')
  for (const [name, sql] of STEPS) {
    try {
      await prisma.$executeRawUnsafe(sql)
      console.log(`  OK    ${name}`)
    } catch (e) {
      console.log(`  SKIP  ${name} :: ${String(e.message).split('\n')[0]}`)
    }
  }

  const idx = await prisma.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'Post' ORDER BY indexname`
  )
  console.log('\n  Post 表现有索引：')
  idx.forEach((r) => console.log('   -', r.indexname))
  console.log('')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('[fail]', e.message)
  await prisma.$disconnect()
  process.exit(1)
})

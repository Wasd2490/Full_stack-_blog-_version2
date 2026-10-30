/**
 * 把 V1 (Flask + SQLite) 导出的数据导入到 V2 (Next.js + PostgreSQL)
 *
 * 用法：
 *   npx tsx scripts/import-from-sqlite.ts [JSON路径] [--dry-run]
 *
 * 特性：
 *   - 幂等：所有实体用 legacyId 做 upsert，重复执行不会产生重复数据
 *   - 字段映射：V1 cat -> Category；V1 date(YYYY-MM-DD) -> publishedAt；V1 pwd(sha256) 原样保留，
 *     用户下次登录时由 lib/auth.ts 自动升级为 scrypt
 *   - 外键顺序：User -> Category -> Post -> Comment -> Moment -> Like
 *   - 标签：正文末尾若有「标签：A、B」或「tags: a,b」行则解析为标签，否则留空（后续后台补）
 */
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient, PostStatus } from '@prisma/client'
import { pinyin } from 'pinyin-pro'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry-run')
const JSON_PATH =
  process.argv.find((a) => a.endsWith('.json')) ||
  path.join(process.cwd(), 'data', 'v1-export.json')

type V1Data = {
  users: Array<{ legacyId: number; email: string; nick: string; password: string; avatar?: string }>
  posts: Array<{
    legacyId: number
    uid: number
    title: string
    cat: string
    content: string
    excerpt?: string
    date: string
    views?: number
    likes?: number
  }>
  moments: Array<{ legacyId: number; text: string; media?: string; type?: string; date: string }>
  comments: Array<{
    legacyId: number
    targetType: string
    targetId: string
    nick: string
    avatar?: string
    content: string
    date: string
  }>
  likes: Array<{ uid: number; postId: number }>
}

/** 中文转拼音 + 英文保留，保证 slug 只含 [a-z0-9-]（与 lib/utils.ts 的 slugify 保持一致） */
function slugify(input: string, fallback = 'post'): string {
  const withPinyin = input.replace(/[\u4e00-\u9fa5]+/g, (m) =>
    ` ${pinyin(m, { toneType: 'none', type: 'array' }).join('-')} `
  )
  const s = withPinyin
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return s || `${fallback}-${Date.now().toString(36)}`
}

function countWords(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_\-|>]/g, ' ')
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length
  return cjk + en
}

function makeExcerpt(markdown: string, len = 120): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > len ? text.slice(0, len) + '…' : text
}

/** V1 日期形如 2026-10-21 或 2026-10-21 14:30，统一转 Date（中午 12 点避免时区漂移） */
function parseDate(s: string): Date {
  if (!s) return new Date()
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s)
  if (!m) return new Date()
  const [, y, mo, d, h = '12', mi = '00'] = m
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))
}

/** 从正文末尾解析标签：支持「标签：A、B、C」「tags: a,b」「#标签」 */
function parseTags(content: string): string[] {
  const lines = content.split('\n')
  for (const line of lines) {
    const cn = /^\s*(?:标签|tags?|关键词)\s*[:：]\s*(.+)$/i.exec(line)
    if (cn) {
      return cn[1]
        .split(/[、,，|\/]/)
        .map((t) => t.trim())
        .filter((t) => t && t.length <= 20)
        .slice(0, 8)
    }
  }
  return []
}

async function uniqueSlug(base: string, taken: Set<string>): Promise<string> {
  let s = base
  let i = 2
  while (taken.has(s)) {
    s = `${base}-${i++}`
  }
  taken.add(s)
  return s
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`[x] 找不到导出文件：${JSON_PATH}\n请先运行：npm run export:v1`)
    process.exit(1)
  }

  const data: V1Data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
  console.log(`[i] 读取 ${JSON_PATH}`)
  console.log(
    `    users=${data.users.length} posts=${data.posts.length} moments=${data.moments.length} comments=${data.comments.length} likes=${data.likes.length}`
  )
  if (DRY) console.log('[i] dry-run 模式，不会写入数据库')

  const stats = { users: 0, categories: 0, tags: 0, posts: 0, moments: 0, comments: 0, likes: 0 }

  // ---------- 1. 用户 ----------
  // 规则：ADMIN_EMAIL 命中者优先；否则 legacyId 最小的用户成为管理员
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || ''
  const ownerLegacyId = adminEmail
    ? (data.users.find((u) => u.email === adminEmail)?.legacyId ?? Math.min(...data.users.map((u) => u.legacyId)))
    : Math.min(...data.users.map((u) => u.legacyId))

  const userMap = new Map<number, number>() // legacyId -> newId
  for (const u of data.users) {
    const role = u.legacyId === ownerLegacyId ? 'ADMIN' : 'USER'
    if (!DRY) {
      const row = await prisma.user.upsert({
        where: { legacyId: u.legacyId },
        create: {
          email: u.email,
          nick: u.nick,
          password: u.password,
          avatar: u.avatar || null,
          role,
          legacyId: u.legacyId,
        },
        update: { nick: u.nick, avatar: u.avatar || null },
        select: { id: true },
      })
      userMap.set(u.legacyId, row.id)
    }
    stats.users++
  }

  if (data.users.length === 0) {
    // 兜底作者，避免文章外键悬空
    const fallback = await prisma.user.upsert({
      where: { email: 'admin@blog.local' },
      create: { email: 'admin@blog.local', nick: process.env.AUTHOR_NAME || '博主', password: '', role: 'ADMIN' },
      update: {},
      select: { id: true },
    })
    userMap.set(0, fallback.id)
  }

  const defaultAuthorId = userMap.get(ownerLegacyId) ?? userMap.get(0) ?? userMap.values().next().value!

  // ---------- 2. 分类 ----------
  const catSlugs = new Map<string, { id: number; slug: string }>()
  const takenCatSlug = new Set<string>()
  for (const p of data.posts) {
    const name = (p.cat || '默认').trim()
    if (catSlugs.has(name)) continue
    let slug = await uniqueSlug(slugify(name, 'cat'), takenCatSlug)
    let id = 0
    if (!DRY) {
      const c = await prisma.category.upsert({
        where: { name },
        create: { name, slug },
        update: {},
        select: { id: true, slug: true },
      })
      id = c.id
      slug = c.slug
    }
    catSlugs.set(name, { id, slug })
    stats.categories++
  }

  // ---------- 3. 标签 ----------
  const tagMap = new Map<string, number>()
  const takenTagSlug = new Set<string>()
  async function ensureTag(name: string): Promise<number> {
    if (tagMap.has(name)) return tagMap.get(name)!
    const slug = await uniqueSlug(slugify(name, 'tag'), takenTagSlug)
    let id = 0
    if (!DRY) {
      const t = await prisma.tag.upsert({ where: { name }, create: { name, slug }, update: {}, select: { id: true } })
      id = t.id
    }
    tagMap.set(name, id)
    stats.tags++
    return id
  }

  // ---------- 4. 文章 ----------
  const postMap = new Map<number, number>() // legacyId -> newId
  const takenPostSlug = new Set<string>(
    DRY ? [] : (await prisma.post.findMany({ select: { slug: true } })).map((p) => p.slug)
  )

  for (const p of data.posts) {
    const slug = await uniqueSlug(slugify(p.title, 'post'), takenPostSlug)
    const cat = catSlugs.get((p.cat || '默认').trim())
    const authorId = userMap.get(p.uid) ?? defaultAuthorId
    const publishedAt = parseDate(p.date)
    const excerpt = p.excerpt?.trim() || makeExcerpt(p.content)
    const tags = parseTags(p.content)

    if (!DRY) {
      const row = await prisma.post.upsert({
        where: { legacyId: p.legacyId },
        create: {
          title: p.title,
          slug,
          content: p.content,
          excerpt,
          status: PostStatus.PUBLISHED,
          publishedAt,
          viewCount: p.views ?? 0,
          likeCount: p.likes ?? 0,
          commentCount: 0,
          wordCount: countWords(p.content),
          authorId,
          categoryId: cat?.id ?? null,
          legacyId: p.legacyId,
          createdAt: publishedAt,
        },
        update: {
          title: p.title,
          content: p.content,
          excerpt,
          wordCount: countWords(p.content),
          categoryId: cat?.id ?? null,
        },
        select: { id: true },
      })
      postMap.set(p.legacyId, row.id)

      for (const t of tags) {
        const tagId = await ensureTag(t)
        await prisma.postTag.upsert({
          where: { postId_tagId: { postId: row.id, tagId } },
          create: { postId: row.id, tagId },
          update: {},
        })
      }
    }
    stats.posts++
  }

  // ---------- 5. 评论 ----------
  for (const c of data.comments) {
    const postId = c.targetType === 'post' ? postMap.get(Number(c.targetId)) : undefined
    if (!postId) continue
    if (!DRY) {
      await prisma.comment.upsert({
        where: { legacyId: c.legacyId },
        create: {
          content: c.content,
          postId,
          guestNick: c.nick,
          status: 'APPROVED',
          depth: 0,
          legacyId: c.legacyId,
          createdAt: parseDate(c.date),
        },
        update: {},
      })
      // 重算评论数
      const n = await prisma.comment.count({ where: { postId, deletedAt: null, status: 'APPROVED' } })
      await prisma.post.update({ where: { id: postId }, data: { commentCount: n } })
    }
    stats.comments++
  }

  // ---------- 6. 动态 ----------
  for (const m of data.moments) {
    if (!DRY) {
      const media = m.media ? m.media.split(/[ ,]/).filter(Boolean) : []
      await prisma.moment.upsert({
        where: { legacyId: m.legacyId },
        create: {
          content: m.text || '',
          media: JSON.stringify(media),
          type: m.type || 'text',
          authorId: defaultAuthorId,
          legacyId: m.legacyId,
          createdAt: parseDate(m.date),
        },
        update: {},
      })
    }
    stats.moments++
  }

  // ---------- 7. 点赞 ----------
  for (const l of data.likes) {
    const userId = userMap.get(l.uid)
    const postId = postMap.get(l.postId)
    if (!userId || !postId) continue
    if (!DRY) {
      await prisma.like.upsert({
        where: { userId_postId: { userId, postId } },
        create: { userId, postId },
        update: {},
      })
    }
    stats.likes++
  }

  console.log('[✓] 导入完成：', stats)
  if (DRY) console.log('    （dry-run，未写入）')
}

main()
  .catch((e) => {
    console.error('[x] 导入失败：', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

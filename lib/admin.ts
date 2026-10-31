'use server'

import { revalidatePath } from 'next/cache'
import { Prisma, PostStatus, CommentStatus } from '@prisma/client'
import { prisma } from './db'
import { getSessionUser, type SessionUser } from './auth'
import { slugify, countWords, makeExcerpt } from './utils'

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; msg: string }

/** 管理员校验，失败返回 null（Server Action 内每次都重新校验，不依赖前端传参） */
async function assertAdmin(): Promise<SessionUser | null> {
  const u = await getSessionUser()
  if (!u || u.role !== 'ADMIN') return null
  return u
}

const KEEP_VERSIONS = 10

export type PostInput = {
  id?: number
  title: string
  slug?: string
  content: string
  excerpt?: string
  cover?: string
  categoryName?: string
  tags?: string[]
  status: 'DRAFT' | 'PUBLISHED'
  scheduledAt?: string | null
  pinned?: boolean
  columnId?: number | null
}

/** 新建或更新文章（含分类/标签联动、版本历史、定时发布） */
export async function savePostAction(input: PostInput): Promise<ActionResult<{ id: number; slug: string }>> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }

  const title = (input.title ?? '').trim()
  const content = input.content ?? ''
  if (!title) return { ok: false, msg: '标题不能为空' }
  if (!content.trim()) return { ok: false, msg: '正文不能为空' }

  // slug 唯一化
  let slug = (input.slug ?? '').trim() || slugify(title)
  const conflict = await prisma.post.findFirst({
    where: { slug, ...(input.id ? { NOT: { id: input.id } } : {}) },
    select: { id: true },
  })
  if (conflict) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

  // 分类
  let categoryId: number | null = null
  const catName = (input.categoryName ?? '').trim()
  if (catName) {
    const cat = await prisma.category.upsert({
      where: { name: catName },
      create: { name: catName, slug: slugify(catName, 'cat') },
      update: {},
      select: { id: true },
    })
    categoryId = cat.id
  }

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
  const isPublished = input.status === 'PUBLISHED'

  const data = {
    title,
    slug,
    content,
    excerpt: (input.excerpt ?? '').trim() || makeExcerpt(content),
    cover: input.cover || null,
    status: input.status as PostStatus,
    publishedAt: isPublished ? new Date() : null,
    scheduledAt,
    pinned: !!input.pinned,
    categoryId,
    columnId: input.columnId ?? null,
    wordCount: countWords(content),
  }

  let postId: number
  let finalSlug = slug

  if (input.id) {
    // 更新：先存版本快照
    const old = await prisma.post.findUnique({
      where: { id: input.id },
      select: { title: true, content: true, excerpt: true, publishedAt: true },
    })
    if (old) {
      await prisma.postVersion.create({
        data: {
          postId: input.id,
          title: old.title,
          content: old.content,
          excerpt: old.excerpt,
          editorId: admin.id,
        },
      })
      // 只保留最近 N 版
      const versions = await prisma.postVersion.findMany({
        where: { postId: input.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      if (versions.length > KEEP_VERSIONS) {
        await prisma.postVersion.deleteMany({
          where: { id: { in: versions.slice(KEEP_VERSIONS).map((v) => v.id) } },
        })
      }
    }

    const updated = await prisma.post.update({
      where: { id: input.id },
      data: {
        ...data,
        publishedAt: isPublished ? (old?.publishedAt ?? new Date()) : null,
      },
      select: { id: true, slug: true },
    })
    postId = updated.id
    finalSlug = updated.slug
  } else {
    const created = await prisma.post.create({
      data: { ...data, authorId: admin.id },
      select: { id: true, slug: true },
    })
    postId = created.id
    finalSlug = created.slug
  }

  // 标签：重建关联
  const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 10)
  await prisma.postTag.deleteMany({ where: { postId } })
  for (const name of tags) {
    const tag = await prisma.tag.upsert({
      where: { name },
      create: { name, slug: slugify(name, 'tag') },
      update: {},
      select: { id: true },
    })
    await prisma.postTag.create({ data: { postId, tagId: tag.id } })
  }

  revalidatePath('/admin/posts')
  revalidatePath(`/blog/${finalSlug}`)
  revalidatePath('/blog')
  revalidatePath('/')
  return { ok: true, data: { id: postId, slug: finalSlug } }
}

/** 批量操作：发布 / 转草稿 / 删除 / 置顶切换 */
export async function batchPostAction(
  ids: number[],
  action: 'publish' | 'draft' | 'archive' | 'delete' | 'pin' | 'unpin'
): Promise<ActionResult<{ affected: number }>> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }
  if (!ids.length) return { ok: false, msg: '请先选择文章' }

  let affected = 0
  switch (action) {
    case 'publish': {
      const r = await prisma.post.updateMany({
        where: { id: { in: ids } },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      })
      affected = r.count
      break
    }
    case 'draft': {
      const r = await prisma.post.updateMany({
        where: { id: { in: ids } },
        data: { status: 'DRAFT' },
      })
      affected = r.count
      break
    }
    case 'archive': {
      const r = await prisma.post.updateMany({
        where: { id: { in: ids } },
        data: { status: 'ARCHIVED' },
      })
      affected = r.count
      break
    }
    case 'pin': {
      const r = await prisma.post.updateMany({ where: { id: { in: ids } }, data: { pinned: true } })
      affected = r.count
      break
    }
    case 'unpin': {
      const r = await prisma.post.updateMany({ where: { id: { in: ids } }, data: { pinned: false } })
      affected = r.count
      break
    }
    case 'delete': {
      const r = await prisma.post.deleteMany({ where: { id: { in: ids } } })
      affected = r.count
      break
    }
  }

  revalidatePath('/admin/posts')
  revalidatePath('/')
  revalidatePath('/blog')
  return { ok: true, data: { affected } }
}

/** 懒惰调度：把到期的定时文章发布出去（后台列表加载时调用） */
export async function flushScheduledPosts(): Promise<number> {
  const now = new Date()
  const r = await prisma.post.updateMany({
    where: { status: 'DRAFT', scheduledAt: { not: null, lte: now } },
    data: { status: 'PUBLISHED', publishedAt: now, scheduledAt: null },
  })
  if (r.count > 0) revalidatePath('/blog')
  return r.count
}

// ---------- 分类 / 标签 ----------
export async function saveCategoryAction(input: {
  id?: number
  name: string
  slug?: string
  description?: string
  sort?: number
}): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }
  const name = (input.name ?? '').trim()
  if (!name) return { ok: false, msg: '名称不能为空' }

  const slug = (input.slug ?? '').trim() || slugify(name, 'cat')
  if (input.id) {
    await prisma.category.update({
      where: { id: input.id },
      data: { name, slug, description: input.description ?? '', sort: input.sort ?? 0 },
    })
  } else {
    const exists = await prisma.category.findUnique({ where: { name } })
    if (exists) return { ok: false, msg: '分类已存在' }
    await prisma.category.create({ data: { name, slug, description: input.description ?? '', sort: input.sort ?? 0 } })
  }
  revalidatePath('/admin/categories')
  return { ok: true }
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }
  await prisma.category.delete({ where: { id } })
  revalidatePath('/admin/categories')
  return { ok: true }
}

export async function saveTagAction(input: { id?: number; name: string; slug?: string }): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }
  const name = (input.name ?? '').trim()
  if (!name) return { ok: false, msg: '名称不能为空' }

  const slug = (input.slug ?? '').trim() || slugify(name, 'tag')
  if (input.id) {
    await prisma.tag.update({ where: { id: input.id }, data: { name, slug } })
  } else {
    const exists = await prisma.tag.findUnique({ where: { name } })
    if (exists) return { ok: false, msg: '标签已存在' }
    await prisma.tag.create({ data: { name, slug } })
  }
  revalidatePath('/admin/tags')
  return { ok: true }
}

export async function deleteTagAction(id: number): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }
  await prisma.tag.delete({ where: { id } })
  revalidatePath('/admin/tags')
  return { ok: true }
}

// ---------- 评论审核 ----------
export async function moderateCommentAction(
  id: number,
  action: 'approve' | 'reject' | 'delete'
): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }

  const c = await prisma.comment.findUnique({
    where: { id },
    select: { id: true, postId: true, status: true, post: { select: { slug: true } } },
  })
  if (!c) return { ok: false, msg: '评论不存在' }

  if (action === 'delete') {
    await prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } })
    if (c.postId && c.status === 'APPROVED') {
      await prisma.post.update({ where: { id: c.postId }, data: { commentCount: { decrement: 1 } } })
    }
  } else {
    const next: CommentStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
    await prisma.comment.update({ where: { id }, data: { status: next } })
    if (c.postId) {
      if (next === 'APPROVED' && c.status !== 'APPROVED') {
        await prisma.post.update({ where: { id: c.postId }, data: { commentCount: { increment: 1 } } })
      } else if (next === 'REJECTED' && c.status === 'APPROVED') {
        await prisma.post.update({ where: { id: c.postId }, data: { commentCount: { decrement: 1 } } })
      }
    }
  }

  revalidatePath('/admin/comments')
  if (c.post?.slug) revalidatePath(`/blog/${c.post.slug}`)
  return { ok: true }
}

// ---------- 专栏 ----------
export async function saveColumnAction(input: {
  id?: number
  title: string
  slug?: string
  description?: string
  cover?: string
  status?: string
}): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }
  const title = (input.title ?? '').trim()
  if (!title) return { ok: false, msg: '标题不能为空' }

  const slug = (input.slug ?? '').trim() || slugify(title, 'column')
  if (input.id) {
    await prisma.column.update({
      where: { id: input.id },
      data: { title, slug, description: input.description ?? '', cover: input.cover || null },
    })
  } else {
    // 管理员在后台创建的专栏直接发布；用户端 /api/columns 创建的才是 DRAFT
    await prisma.column.create({
      data: {
        title,
        slug,
        description: input.description ?? '',
        cover: input.cover || null,
        ownerId: admin.id,
        status: input.status ?? 'PUBLISHED',
      },
    })
  }
  revalidatePath('/admin/columns')
  revalidatePath('/column')
  return { ok: true }
}

// ---------- 动态 ----------
export async function saveMomentAction(input: {
  id?: number
  content: string
  media?: string[]
  type?: string
}): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }
  const content = (input.content ?? '').trim()
  if (!content) return { ok: false, msg: '内容不能为空' }

  const media = JSON.stringify(input.media ?? [])
  if (input.id) {
    await prisma.moment.update({ where: { id: input.id }, data: { content, media, type: input.type ?? 'text' } })
  } else {
    await prisma.moment.create({
      data: { content, media, type: input.type ?? 'text', authorId: admin.id },
    })
  }
  revalidatePath('/admin/moments')
  revalidatePath('/moments')
  revalidatePath('/')
  return { ok: true }
}

export async function deleteMomentAction(id: number): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }
  await prisma.moment.delete({ where: { id } })
  revalidatePath('/admin/moments')
  revalidatePath('/moments')
  return { ok: true }
}

// ---------- 相册 ----------
export async function saveAlbumAction(input: {
  id?: number
  title: string
  description?: string
  cover?: string
}): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }
  const title = (input.title ?? '').trim()
  if (!title) return { ok: false, msg: '标题不能为空' }

  if (input.id) {
    await prisma.album.update({
      where: { id: input.id },
      data: { title, description: input.description ?? '', cover: input.cover || null },
    })
  } else {
    await prisma.album.create({
      data: { title, description: input.description ?? '', cover: input.cover || null, ownerId: admin.id },
    })
  }
  revalidatePath('/admin/albums')
  revalidatePath('/album')
  return { ok: true }
}

export async function addPhotoAction(albumId: number, url: string, caption?: string): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }
  const count = await prisma.photo.count({ where: { albumId } })
  await prisma.photo.create({ data: { albumId, url, caption: caption ?? '', sort: count } })
  revalidatePath('/admin/albums')
  revalidatePath('/album')
  return { ok: true }
}

export async function deletePhotoAction(id: number): Promise<ActionResult> {
  const admin = await assertAdmin()
  if (!admin) return { ok: false, msg: '请先登录或没有权限' }
  await prisma.photo.delete({ where: { id } })
  revalidatePath('/admin/albums')
  return { ok: true }
}

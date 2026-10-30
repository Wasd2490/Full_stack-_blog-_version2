'use server'

import { revalidatePath } from 'next/cache'
import { prisma, commentNeedsReview, getSetting, SETTINGS } from './db'
import { getSessionUser } from './auth'

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; msg: string; needLogin?: boolean }

const MAX_COMMENT_DEPTH = 2 // 0/1/2 => 最多 3 层

/** 点赞 / 取消点赞（同一用户对同一文章只记一次，可逆） */
export async function toggleLikeAction(postId: number): Promise<ActionResult<{ liked: boolean; count: number }>> {
  const user = await getSessionUser()
  if (!user) return { ok: false, msg: '请先登录后再点赞', needLogin: true }

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, slug: true } })
  if (!post) return { ok: false, msg: '文章不存在' }

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
    select: { id: true },
  })

  let liked: boolean
  if (existing) {
    await prisma.$transaction([
      prisma.like.delete({ where: { id: existing.id } }),
      prisma.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      }),
    ])
    liked = false
  } else {
    await prisma.$transaction([
      prisma.like.create({ data: { userId: user.id, postId } }),
      prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ])
    liked = true
  }

  const fresh = await prisma.post.findUnique({ where: { id: postId }, select: { likeCount: true } })
  revalidatePath(`/blog/${post.slug}`)
  return { ok: true, data: { liked, count: fresh?.likeCount ?? 0 } }
}

/** 收藏 / 取消收藏 */
export async function toggleBookmarkAction(postId: number): Promise<ActionResult<{ bookmarked: boolean }>> {
  const user = await getSessionUser()
  if (!user) return { ok: false, msg: '请先登录后再收藏', needLogin: true }

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { slug: true } })
  if (!post) return { ok: false, msg: '文章不存在' }

  const existing = await prisma.bookmark.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
    select: { id: true },
  })

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } })
    revalidatePath(`/blog/${post.slug}`)
    return { ok: true, data: { bookmarked: false } }
  }

  await prisma.bookmark.create({ data: { userId: user.id, postId } })
  revalidatePath(`/blog/${post.slug}`)
  return { ok: true, data: { bookmarked: true } }
}

/** 发表评论（支持嵌套回复，最多 3 层；软删除；受审核开关控制） */
export async function addCommentAction(input: {
  postId: number
  content: string
  parentId?: number | null
}): Promise<ActionResult<{ id: number; pending: boolean }>> {
  const user = await getSessionUser()
  if (!user) return { ok: false, msg: '请先登录后再评论', needLogin: true }

  const content = (input.content ?? '').trim()
  if (!content) return { ok: false, msg: '评论内容不能为空' }
  if (content.length > 2000) return { ok: false, msg: '评论内容过长（最多 2000 字）' }

  const post = await prisma.post.findUnique({ where: { id: input.postId }, select: { id: true, slug: true } })
  if (!post) return { ok: false, msg: '文章不存在' }

  let depth = 0
  if (input.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: input.parentId },
      select: { id: true, depth: true, postId: true },
    })
    if (!parent || parent.postId !== post.id) return { ok: false, msg: '父评论不存在' }
    depth = Math.min(MAX_COMMENT_DEPTH, parent.depth + 1)
  }

  const needsReview = await commentNeedsReview()
  const status = needsReview ? 'PENDING' : 'APPROVED'

  const created = await prisma.$transaction(async (tx) => {
    const c = await tx.comment.create({
      data: {
        content,
        postId: post.id,
        authorId: user.id,
        parentId: input.parentId ?? null,
        depth,
        status,
      },
      select: { id: true },
    })
    if (status === 'APPROVED') {
      await tx.post.update({ where: { id: post.id }, data: { commentCount: { increment: 1 } } })
    }
    return c
  })

  revalidatePath(`/blog/${post.slug}`)
  return { ok: true, data: { id: created.id, pending: status === 'PENDING' } }
}

/** 评论作者/管理员软删除 */
export async function deleteCommentAction(commentId: number): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, msg: '请先登录', needLogin: true }

  const c = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, postId: true, post: { select: { slug: true } } },
  })
  if (!c) return { ok: false, msg: '评论不存在' }
  if (c.authorId !== user.id && user.role !== 'ADMIN') return { ok: false, msg: '没有权限' }

  await prisma.$transaction(async (tx) => {
    await tx.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } })
    if (c.postId) {
      await tx.post.update({
        where: { id: c.postId },
        data: { commentCount: { decrement: 1 } },
      })
    }
  })

  if (c.post?.slug) revalidatePath(`/blog/${c.post.slug}`)
  return { ok: true }
}

/** 关注 / 取消关注博主 */
export async function toggleFollowAction(targetId: number): Promise<ActionResult<{ following: boolean }>> {
  const user = await getSessionUser()
  if (!user) return { ok: false, msg: '请先登录', needLogin: true }
  if (targetId === user.id) return { ok: false, msg: '不能关注自己' }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: targetId } },
    select: { id: true },
  })

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } })
    revalidatePath(`/u/${targetId}`)
    return { ok: true, data: { following: false } }
  }

  await prisma.follow.create({ data: { followerId: user.id, followingId: targetId } })
  revalidatePath(`/u/${targetId}`)
  return { ok: true, data: { following: true } }
}

/** 管理员切换站点配置 */
export async function updateSettingAction(key: string, value: string): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { ok: false, msg: '没有权限' }
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
  revalidatePath('/admin/settings')
  revalidatePath('/', 'layout')
  return { ok: true }
}

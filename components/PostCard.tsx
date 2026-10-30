'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export type PostCardData = {
  id: number
  title: string
  slug: string
  excerpt: string | null
  publishedAt: Date | null
  viewCount: number
  likeCount: number
  commentCount: number
  wordCount: number
  pinned?: boolean
  category?: { name: string; slug: string } | null
  author?: { nick: string; avatar: string | null } | null
  tags?: { name: string; slug: string }[]
}

/** 带 3D 倾斜效果的文章卡片 */
export function PostCard({ post, showEdit = false }: { post: PostCardData; showEdit?: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('')

  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = (y - centerY) / 15
    const rotateY = (centerX - x) / 15
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`)
  }

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0) rotateY(0)')
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transition: 'transform 0.1s ease-out',
        transformStyle: 'preserve-3d',
      }}
    >
      <article className="card post-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 8 }}>
          {post.pinned && <span className="badge badge-warn">📌 置顶</span>}
          {post.category && (
            <Link href={`/category/${post.category.slug}`} className="tag-chip">
              {post.category.name}
            </Link>
          )}
          <span className="muted">{formatDate(post.publishedAt)}</span>
        </div>

        <h3>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>

        {post.excerpt && (
          <p className="muted" style={{ fontSize: 14, margin: '6px 0 0', lineHeight: 1.7 }}>
            {post.excerpt}
          </p>
        )}

        {showEdit && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <Link
              href={`/admin/posts/${post.id}/edit`}
              style={{ fontSize: 13, color: 'var(--brand)' }}
            >
              ✏️ 编辑文章
            </Link>
          </div>
        )}
      </article>
    </div>
  )
}

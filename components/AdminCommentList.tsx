'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { moderateCommentAction } from '@/lib/admin'
import { timeAgo } from '@/lib/utils'

type Item = {
  id: number
  content: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  authorNick: string
  postTitle: string
  postSlug: string | null
}

const TABS = [
  { key: 'PENDING', label: '待审核' },
  { key: 'APPROVED', label: '已通过' },
  { key: 'REJECTED', label: '已拒绝' },
  { key: 'ALL', label: '全部' },
]

export function AdminCommentList({
  comments,
  status,
  counts,
}: {
  comments: Item[]
  status: string
  counts: { PENDING: number; APPROVED: number; REJECTED: number }
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [ids, setIds] = useState<number[]>([])

  function act(id: number, action: 'approve' | 'reject' | 'delete') {
    start(async () => {
      await moderateCommentAction(id, action)
      router.refresh()
    })
  }

  function approveAll() {
    if (!comments.length) return
    start(async () => {
      for (const c of comments) await moderateCommentAction(c.id, 'approve')
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="card" style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/comments?status=${t.key}`} className={`btn ${status === t.key ? 'btn-primary' : ''}`}>
            {t.label}
            {t.key !== 'ALL' && ` (${counts[t.key as keyof typeof counts]})`}
          </Link>
        ))}
        {status === 'PENDING' && comments.length > 0 && (
          <button className="btn" onClick={approveAll} disabled={pending} style={{ marginLeft: 'auto' }}>
            一键通过本页 {comments.length} 条
          </button>
        )}
      </div>

      {comments.length === 0 ? (
        <div className="card" style={{ padding: 36, textAlign: 'center' }}>
          <p className="muted">没有符合条件的评论</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {comments.map((c) => (
            <div key={c.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
                <strong>{c.authorNick}</strong>
                <span className="muted">{timeAgo(c.createdAt)}</span>
                <span className={`badge ${c.status === 'APPROVED' ? 'badge-ok' : c.status === 'PENDING' ? 'badge-warn' : 'badge-err'}`}>
                  {c.status === 'APPROVED' ? '已通过' : c.status === 'PENDING' ? '待审核' : '已拒绝'}
                </span>
                {c.postSlug ? (
                  <Link href={`/blog/${c.postSlug}`} className="muted" target="_blank">
                    {c.postTitle}
                  </Link>
                ) : (
                  <span className="muted">{c.postTitle}</span>
                )}
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 14.5, whiteSpace: 'pre-wrap' }}>{c.content}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {c.status !== 'APPROVED' && (
                  <button className="btn" onClick={() => act(c.id, 'approve')} disabled={pending}>通过</button>
                )}
                {c.status !== 'REJECTED' && (
                  <button className="btn" onClick={() => act(c.id, 'reject')} disabled={pending}>拒绝</button>
                )}
                <button className="btn" onClick={() => act(c.id, 'delete')} disabled={pending} style={{ color: '#b91c1c' }}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

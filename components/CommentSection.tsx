'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { addCommentAction, deleteCommentAction } from '@/lib/actions'
import { timeAgo, DEFAULT_AVATAR } from '@/lib/utils'

export type CommentNode = {
  id: number
  content: string
  depth: number
  createdAt: string
  authorId: number | null
  author: { id: number | null; nick: string; avatar: string | null }
  replies: CommentNode[]
}

type Me = { id: number; nick: string; avatar: string | null; role: string } | null

/** 渲染 @提及，内容由 React 转义，这里只做标记拆分 */
function renderContent(content: string) {
  const parts = content.split(/(@[\u4e00-\u9fa5A-Za-z0-9_-]{1,20})/g)
  return parts.map((p, i) =>
    p.startsWith('@') ? (
      <span key={i} style={{ color: 'var(--brand)' }}>
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  )
}

function CommentForm({
  postId,
  parentId,
  onDone,
  placeholder = '写下你的评论…',
  compact,
}: {
  postId: number
  parentId?: number | null
  onDone?: () => void
  placeholder?: string
  compact?: boolean
}) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  function submit() {
    const content = value.trim()
    if (!content) return
    start(async () => {
      const res = await addCommentAction({ postId, content, parentId: parentId ?? null })
      if (!res.ok) {
        if (res.needLogin) {
          setMsg('请先登录后再评论')
          setTimeout(() => router.push('/login'), 600)
        } else setMsg(res.msg)
        return
      }
      setValue('')
      setMsg(res.data?.pending ? '评论已提交，等待审核通过后公开显示' : '')
      onDone?.()
      router.refresh()
    })
  }

  return (
    <div style={{ marginTop: compact ? 8 : 12 }}>
      <textarea
        className="input"
        rows={compact ? 2 : 3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={2000}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <button className="btn btn-primary" onClick={submit} disabled={pending || !value.trim()}>
          {pending ? '提交中…' : '发表评论'}
        </button>
        {onDone && (
          <button className="btn" onClick={onDone}>
            取消
          </button>
        )}
        {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
      </div>
    </div>
  )
}

function CommentItem({ node, postId, me }: { node: CommentNode; postId: number; me: Me }) {
  const [replying, setReplying] = useState(false)
  const [, start] = useTransition()
  const router = useRouter()

  const canDelete = !!me && (me.role === 'ADMIN' || (!!node.authorId && me.id === node.authorId))

  function remove() {
    if (!confirm('确定删除这条评论？')) return
    start(async () => {
      await deleteCommentAction(node.id)
      router.refresh()
    })
  }

  return (
    <div className="comment-item" style={{ paddingLeft: node.depth > 0 ? 16 : 0 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="comment-avatar" src={node.author.avatar || DEFAULT_AVATAR} alt="" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
            <strong>{node.author.nick}</strong>
            <span className="muted">{timeAgo(node.createdAt)}</span>
          </div>
          <div className="comment-body" style={{ whiteSpace: 'pre-wrap', fontSize: 14.5 }}>
            {renderContent(node.content)}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 13 }}>
            {node.depth < 2 && (
              <button
                className="muted"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => {
                  if (!me) {
                    router.push('/login')
                    return
                  }
                  setReplying(!replying)
                }}
              >
                {replying ? '收起' : '回复'}
              </button>
            )}
            {canDelete && (
              <button
                className="muted"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={remove}
              >
                删除
              </button>
            )}
          </div>

          {replying && (
            <CommentForm
              postId={postId}
              parentId={node.id}
              compact
              placeholder={`回复 @${node.author.nick}：支持 @提及`}
              onDone={() => setReplying(false)}
            />
          )}

          {node.replies.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {node.replies.map((child) => (
                <CommentItem key={child.id} node={child} postId={postId} me={me} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function CommentSection({ postId, comments }: { postId: number; comments: CommentNode[] }) {
  const [me, setMe] = useState<Me>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setMe(j.user ?? null))
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [])

  return (
    <section id="comments" className="card" style={{ padding: 20, marginTop: 20 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>评论 · {comments.length}</h2>

      {me ? (
        <CommentForm postId={postId} placeholder="写下你的评论，支持 @提及" />
      ) : (
        <p className="muted" style={{ fontSize: 14 }}>
          {checked ? (
            <>
              <Link href="/login" style={{ color: 'var(--brand)' }}>
                登录
              </Link>{' '}
              后参与评论
            </>
          ) : (
            '　'
          )}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        {comments.length === 0 ? (
          <p className="muted" style={{ fontSize: 14, paddingTop: 12 }}>
            还没有评论，来说两句吧。
          </p>
        ) : (
          comments.map((c) => <CommentItem key={c.id} node={c} postId={postId} me={me} />)
        )}
      </div>
    </section>
  )
}

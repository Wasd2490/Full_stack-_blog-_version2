'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { batchPostAction } from '@/lib/admin'
import { formatDate } from '@/lib/utils'

type Row = {
  id: number
  title: string
  slug: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  pinned: boolean
  viewCount: number
  likeCount: number
  commentCount: number
  publishedAt: string | null
  scheduledAt: string | null
  updatedAt: string
  categoryName: string | null
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  PUBLISHED: { text: '已发布', cls: 'badge-ok' },
  DRAFT: { text: '草稿', cls: 'badge-warn' },
  ARCHIVED: { text: '归档', cls: 'badge-err' },
}

export function AdminPostList({
  posts,
  total,
  page,
  pageSize,
  categories,
  filters,
}: {
  posts: Row[]
  total: number
  page: number
  pageSize: number
  categories: { id: number; name: string }[]
  filters: { status: string; category: string; q: string }
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<number[]>([])
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  const allChecked = posts.length > 0 && selected.length === posts.length

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  function run(action: 'publish' | 'draft' | 'archive' | 'delete' | 'pin' | 'unpin') {
    if (!selected.length) return
    if (action === 'delete' && !confirm(`确定删除选中的 ${selected.length} 篇文章？该操作不可恢复。`)) return
    start(async () => {
      const res = await batchPostAction(selected, action)
      if (!res.ok) {
        setMsg(res.msg)
        return
      }
      setMsg(`已处理 ${res.data?.affected ?? 0} 篇`)
      setSelected([])
      router.refresh()
    })
  }

  function applyFilter(next: Partial<typeof filters>) {
    const params = new URLSearchParams()
    const merged = { ...filters, ...next }
    if (merged.status && merged.status !== 'ALL') params.set('status', merged.status)
    if (merged.category) params.set('category', merged.category)
    if (merged.q) params.set('q', merged.q)
    const qs = params.toString()
    router.push(`/admin/posts${qs ? `?${qs}` : ''}`)
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* 筛选 */}
      <div className="card" style={{ padding: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" style={{ width: 130 }} value={filters.status} onChange={(e) => applyFilter({ status: e.target.value })}>
          <option value="ALL">全部状态</option>
          <option value="PUBLISHED">已发布</option>
          <option value="DRAFT">草稿</option>
          <option value="ARCHIVED">归档</option>
        </select>
        <select className="input" style={{ width: 150 }} value={filters.category} onChange={(e) => applyFilter({ category: e.target.value })}>
          <option value="">全部分类</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const v = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value
            applyFilter({ q: v })
          }}
          style={{ display: 'flex', gap: 6, flex: 1, minWidth: 200 }}
        >
          <input className="input" name="q" defaultValue={filters.q} placeholder="搜索标题或正文…" />
          <button className="btn" type="submit">搜索</button>
        </form>
        <Link href="/admin/posts/new" className="btn btn-primary">
          写文章
        </Link>
      </div>

      {/* 批量操作条 */}
      {selected.length > 0 && (
        <div className="card" style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14 }}>已选 {selected.length} 篇</span>
          <button className="btn" onClick={() => run('publish')} disabled={pending}>发布</button>
          <button className="btn" onClick={() => run('draft')} disabled={pending}>转草稿</button>
          <button className="btn" onClick={() => run('pin')} disabled={pending}>置顶</button>
          <button className="btn" onClick={() => run('unpin')} disabled={pending}>取消置顶</button>
          <button className="btn" onClick={() => run('archive')} disabled={pending}>归档</button>
          <button className="btn" onClick={() => run('delete')} disabled={pending} style={{ color: '#b91c1c' }}>
            删除
          </button>
          <button className="btn" onClick={() => setSelected([])}>取消选择</button>
        </div>
      )}

      {msg && <p className="muted" style={{ fontSize: 13.5 }}>{msg}</p>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--surface-2)' }}>
              <th style={{ padding: 10, width: 36 }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() => setSelected(allChecked ? [] : posts.map((p) => p.id))}
                />
              </th>
              <th style={{ padding: 10 }}>标题</th>
              <th style={{ padding: 10, width: 90 }}>状态</th>
              <th style={{ padding: 10, width: 110 }}>分类</th>
              <th style={{ padding: 10, width: 130 }}>时间</th>
              <th style={{ padding: 10, width: 90 }}>数据</th>
              <th style={{ padding: 10, width: 80 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 30, textAlign: 'center' }} className="muted">
                  没有符合条件的文章
                </td>
              </tr>
            )}
            {posts.map((p) => {
              const st = STATUS_LABEL[p.status]
              return (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: 10 }}>
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
                  </td>
                  <td style={{ padding: 10 }}>
                    <Link href={`/admin/posts/${p.id}/edit`} style={{ fontWeight: 500 }}>
                      {p.pinned && <span className="badge badge-warn" style={{ marginRight: 6 }}>置顶</span>}
                      {p.title}
                    </Link>
                  </td>
                  <td style={{ padding: 10 }}>
                    <span className={`badge ${st.cls}`}>{st.text}</span>
                    {p.scheduledAt && p.status === 'DRAFT' && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        定时 {formatDate(p.scheduledAt, 'datetime')}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 10 }} className="muted">{p.categoryName ?? '—'}</td>
                  <td style={{ padding: 10 }} className="muted">
                    {p.publishedAt ? formatDate(p.publishedAt) : `更新 ${formatDate(p.updatedAt)}`}
                  </td>
                  <td style={{ padding: 10 }} className="muted">
                    {p.viewCount}/{p.likeCount}/{p.commentCount}
                  </td>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href={`/admin/posts/${p.id}/edit`} className="muted">编辑</Link>
                      <Link href={`/blog/${p.slug}`} className="muted" target="_blank">查看</Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', fontSize: 14 }}>
          {page > 1 && (
            <Link href={`/admin/posts?page=${page - 1}`} className="btn">上一页</Link>
          )}
          <span className="muted" style={{ alignSelf: 'center' }}>
            第 {page} / {Math.ceil(total / pageSize)} 页 · 共 {total} 篇
          </span>
          {page < Math.ceil(total / pageSize) && (
            <Link href={`/admin/posts?page=${page + 1}`} className="btn">下一页</Link>
          )}
        </div>
      )}
    </div>
  )
}

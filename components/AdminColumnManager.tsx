'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { saveColumnAction } from '@/lib/admin'

type Column = {
  id: number
  title: string
  slug: string
  description: string | null
  status: string
  count: number
  ownerNick: string
}

export function AdminColumnManager({ columns }: { columns: Column[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  function create() {
    if (!title.trim()) return
    start(async () => {
      const res = await saveColumnAction({ title, description: desc })
      if (!res.ok) {
        setMsg(res.msg)
        return
      }
      setTitle('')
      setDesc('')
      setMsg('已创建')
      router.refresh()
    })
  }

  function updateStatus(id: number, status: string) {
    start(async () => {
      await fetch(`/api/admin/columns/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    })
  }

  const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
    PUBLISHED: { text: '已发布', cls: 'badge-ok' },
    PENDING: { text: '待审核', cls: 'badge-warn' },
    DRAFT: { text: '草稿', cls: '' },
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="card" style={{ padding: 16, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <input className="input" placeholder="专栏标题" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" placeholder="简介（可选）" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className="btn btn-primary" onClick={create} disabled={pending || !title.trim()}>
          新建专栏
        </button>
        {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--surface-2)' }}>
              <th style={{ padding: 10 }}>标题</th>
              <th style={{ padding: 10 }}>作者</th>
              <th style={{ padding: 10 }}>状态</th>
              <th style={{ padding: 10, width: 70 }}>文章</th>
              <th style={{ padding: 10, width: 150 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {columns.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 26, textAlign: 'center' }} className="muted">
                  暂无专栏
                </td>
              </tr>
            )}
            {columns.map((c) => {
              const st = STATUS_LABEL[c.status] || STATUS_LABEL.DRAFT
              return (
                <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: 10 }}>
                    <Link href={`/column/${c.slug}`} target="_blank">{c.title}</Link>
                  </td>
                  <td style={{ padding: 10 }} className="muted">{c.ownerNick}</td>
                  <td style={{ padding: 10 }}>
                    <span className={`badge ${st.cls}`}>{st.text}</span>
                  </td>
                  <td style={{ padding: 10 }} className="muted">{c.count}</td>
                  <td style={{ padding: 10 }}>
                    {c.status !== 'PUBLISHED' && (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => updateStatus(c.id, 'PUBLISHED')}
                        disabled={pending}
                      >
                        通过发布
                      </button>
                    )}
                    {c.status === 'PUBLISHED' && (
                      <button
                        className="btn"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => updateStatus(c.id, 'DRAFT')}
                        disabled={pending}
                      >
                        下架
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12.5 }}>
        管理员可以直接创建并发布专栏；普通用户创建的专栏默认是草稿，申请审核后管理员通过即可公开展示。
      </p>
    </div>
  )
}

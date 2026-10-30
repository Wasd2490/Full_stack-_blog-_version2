'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveCategoryAction, deleteCategoryAction, saveTagAction, deleteTagAction } from '@/lib/admin'

type Row = { id: number; name: string; slug: string; description?: string | null; count?: number }

export function AdminTaxonomy({
  kind,
  rows,
}: {
  kind: 'category' | 'tag'
  rows: Row[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<Row | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [desc, setDesc] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  function reset() {
    setEditing(null)
    setName('')
    setSlug('')
    setDesc('')
  }

  function submit() {
    start(async () => {
      const res =
        kind === 'category'
          ? await saveCategoryAction({ id: editing?.id, name, slug, description: desc })
          : await saveTagAction({ id: editing?.id, name, slug })
      if (!res.ok) {
        setMsg(res.msg)
        return
      }
      setMsg('已保存')
      reset()
      router.refresh()
    })
  }

  function remove(id: number) {
    if (!confirm('确定删除？关联文章不会被删除。')) return
    start(async () => {
      const res = kind === 'category' ? await deleteCategoryAction(id) : await deleteTagAction(id)
      if (!res.ok) {
        setMsg(res.msg)
        return
      }
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="card" style={{ padding: 16, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <input className="input" placeholder={kind === 'category' ? '分类名称' : '标签名称'} value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="slug（留空自动生成）" value={slug} onChange={(e) => setSlug(e.target.value)} />
        {kind === 'category' && (
          <input className="input" placeholder="描述（可选）" value={desc} onChange={(e) => setDesc(e.target.value)} />
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={submit} disabled={pending || !name.trim()}>
            {editing ? '更新' : '新增'}
          </button>
          {editing && (
            <button className="btn" onClick={reset}>
              取消
            </button>
          )}
        </div>
        {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--surface-2)' }}>
              <th style={{ padding: 10 }}>名称</th>
              <th style={{ padding: 10 }}>Slug</th>
              {kind === 'category' && <th style={{ padding: 10 }}>描述</th>}
              <th style={{ padding: 10, width: 70 }}>文章</th>
              <th style={{ padding: 10, width: 110 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 26, textAlign: 'center' }} className="muted">
                  暂无数据
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: 10 }}>{r.name}</td>
                <td style={{ padding: 10 }} className="muted">{r.slug}</td>
                {kind === 'category' && <td style={{ padding: 10 }} className="muted">{r.description || '—'}</td>}
                <td style={{ padding: 10 }} className="muted">{r.count ?? 0}</td>
                <td style={{ padding: 10, display: 'flex', gap: 8 }}>
                  <button
                    className="muted"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      setEditing(r)
                      setName(r.name)
                      setSlug(r.slug)
                      setDesc(r.description ?? '')
                    }}
                  >
                    编辑
                  </button>
                  <button
                    className="muted"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
                    onClick={() => remove(r.id)}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

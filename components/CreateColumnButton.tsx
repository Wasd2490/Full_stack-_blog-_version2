'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function CreateColumnButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  function create() {
    if (!title.trim()) return
    start(async () => {
      const res = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: desc }),
      })
      const json = await res.json()
      if (json.ok) {
        setOpen(false)
        setTitle('')
        setDesc('')
        router.refresh()
      } else {
        setMsg(json.msg || '创建失败')
      }
    })
  }

  if (!open) {
    return (
      <button
        className="btn"
        style={{ marginBottom: 12, fontSize: 13 }}
        onClick={() => setOpen(true)}
      >
        + 创建专栏
      </button>
    )
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>创建新专栏</h3>
      <input
        className="input"
        placeholder="专栏标题，如：单片机入门10讲"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <textarea
        className="input"
        placeholder="专栏简介（可选）"
        rows={2}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={create} disabled={pending || !title.trim()}>
          {pending ? '创建中…' : '创建'}
        </button>
        <button className="btn" onClick={() => setOpen(false)}>取消</button>
        {msg && <span className="muted" style={{ fontSize: 12 }}>{msg}</span>}
      </div>
    </div>
  )
}

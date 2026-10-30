'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function SubmitColumnButton({ columnId, status }: { columnId: number; status: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  function submit() {
    start(async () => {
      const res = await fetch(`/api/columns/${columnId}/submit`, { method: 'POST' })
      const json = await res.json()
      if (json.ok) {
        setMsg('已提交审核')
        router.refresh()
      } else {
        setMsg(json.msg || '提交失败')
      }
    })
  }

  if (status === 'PENDING') {
    return <span className="muted" style={{ fontSize: 12 }}>等待审核中…</span>
  }
  if (status === 'PUBLISHED') {
    return <span className="badge badge-ok" style={{ fontSize: 12 }}>已发布</span>
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        className="btn btn-primary"
        style={{ padding: '4px 12px', fontSize: 12 }}
        onClick={submit}
        disabled={pending}
      >
        {pending ? '提交中…' : '申请发布'}
      </button>
      {msg && <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{msg}</span>}
    </div>
  )
}

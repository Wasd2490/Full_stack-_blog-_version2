'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSettingAction } from '@/lib/actions'

export function AdminSettings({
  commentReview,
  siteNotice,
}: {
  commentReview: boolean
  siteNotice: string
}) {
  const router = useRouter()
  const [review, setReview] = useState(commentReview)
  const [notice, setNotice] = useState(siteNotice)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  function save() {
    start(async () => {
      await updateSettingAction('comment.review', review ? 'on' : 'off')
      await updateSettingAction('site.notice', notice)
      setMsg('已保存')
      router.refresh()
      setTimeout(() => setMsg(''), 2000)
    })
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>评论设置</h2>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
          <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} />
          <span>开启评论审核（新评论需管理员通过后才会公开显示）</span>
        </label>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
          关闭时评论即时可见；开启后评论进入「待审核」队列，可在评论审核页批量通过。
        </p>
      </section>

      <section className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>站点公告</h2>
        <input
          className="input"
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="显示在首页 Hero 区域，留空则不显示"
        />
      </section>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={save} disabled={pending}>
          {pending ? '保存中…' : '保存设置'}
        </button>
        {msg && <span className="muted" style={{ fontSize: 13.5 }}>{msg}</span>}
      </div>
    </div>
  )
}

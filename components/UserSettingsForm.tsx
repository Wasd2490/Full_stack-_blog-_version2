'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DEFAULT_AVATAR } from '@/lib/utils'

type User = {
  id: number
  nick: string
  email: string
  avatar: string | null
  bio: string | null
}

export function UserSettingsForm({ user }: { user: User }) {
  const router = useRouter()
  const [form, setForm] = useState({
    nick: user.nick,
    bio: user.bio || '',
    avatar: user.avatar || '',
  })
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadAvatar(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    setMsg('上传中…')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.ok) {
        setForm({ ...form, avatar: json.url })
        setMsg('头像上传成功')
      } else {
        setMsg(json.msg || '上传失败')
      }
    } catch {
      setMsg('上传失败')
    }
  }

  function save() {
    start(async () => {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.ok) {
        setMsg('保存成功，正在返回…')
        setTimeout(() => {
          window.location.href = `/u/${user.id}`
        }, 800)
      } else {
        setMsg(json.msg || '保存失败')
      }
    })
  }

  return (
    <div className="card" style={{ padding: 24, maxWidth: 500 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>个人设置</h2>

      {/* 头像上传 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={form.avatar || DEFAULT_AVATAR}
          alt="头像"
          style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', background: 'var(--surface-2)' }}
        />
        <div>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            📷 更换头像
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadAvatar(f)
              e.target.value = ''
            }}
          />
          <p className="muted" style={{ fontSize: 12.5, margin: '6px 0 0' }}>
            支持 JPG、PNG、GIF，手机电脑都能选
          </p>
        </div>
      </div>

      {/* 昵称 */}
      <label style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
        <span className="muted" style={{ fontSize: 13 }}>昵称</span>
        <input
          className="input"
          value={form.nick}
          onChange={(e) => setForm({ ...form, nick: e.target.value })}
          placeholder="你的昵称"
        />
      </label>

      {/* 简介 */}
      <label style={{ display: 'grid', gap: 6, marginBottom: 20 }}>
        <span className="muted" style={{ fontSize: 13 }}>个人简介</span>
        <textarea
          className="input"
          rows={3}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="介绍一下自己吧"
        />
      </label>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={save} disabled={pending}>
          {pending ? '保存中…' : '保存修改'}
        </button>
        {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
      </div>
    </div>
  )
}

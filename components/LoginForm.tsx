'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [nick, setNick] = useState('')
  const [pwd, setPwd] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pwd, nick }),
      })
      const json = await res.json()
      if (!json.ok) {
        setMsg(json.msg || '操作失败')
        setLoading(false)
        return
      }
      router.push(next)
      router.refresh()
    } catch {
      setMsg('网络异常，请重试')
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button className={`btn ${mode === 'login' ? 'btn-primary' : ''}`} onClick={() => setMode('login')} style={{ flex: 1 }}>
          登录
        </button>
        <button className={`btn ${mode === 'register' ? 'btn-primary' : ''}`} onClick={() => setMode('register')} style={{ flex: 1 }}>
          注册
        </button>
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        {mode === 'register' && (
          <input
            className="input"
            placeholder="昵称"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            required
          />
        )}
        <input
          className="input"
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="密码"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          required
          minLength={6}
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '处理中…' : mode === 'login' ? '登录' : '注册并登录'}
        </button>
      </form>

      {msg && (
        <p style={{ color: '#dc2626', fontSize: 13.5, marginTop: 12, textAlign: 'center' }}>{msg}</p>
      )}

      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <a href="/api/auth/github" className="btn" style={{ width: '100%', justifyContent: 'center' }}>
          使用 GitHub 登录
        </a>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
          从 V1 迁移的账号沿用原密码，登录成功后会自动升级加密方式
        </p>
      </div>
    </div>
  )
}

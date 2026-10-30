'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Me = { id: number; nick: string; avatar: string | null; role: string } | null

const NAV = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '文章' },
  { href: '/archive', label: '归档' },
  { href: '/column', label: '专栏' },
  { href: '/moments', label: '动态' },
]

/**
 * 登录态在客户端获取（/api/me），保证页面本身可被静态化 + ISR 缓存，
 * 同时首屏 HTML 里依然有完整的导航结构，不影响 SEO。
 */
export function SiteHeader({ siteName }: { siteName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [me, setMe] = useState<Me>(null)

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setMe(j.user ?? null))
      .catch(() => {})
  }, [pathname])

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <header className="site-header">
      <div className="container-site" style={{ display: 'flex', alignItems: 'center', gap: 16, height: 58 }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: 17, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--brand), #f9a8d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16,
          }}>🌸</span>
          {siteName}
        </Link>

        <nav style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0, overflowX: 'auto' }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`nav-link ${isActive(n.href) ? 'active' : ''}`}>
              {n.label}
            </Link>
          ))}
        </nav>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`)
          }}
          style={{ display: 'flex', gap: 6 }}
        >
          <input
            className="input"
            style={{ width: 170, padding: '6px 12px' }}
            placeholder="搜索文章…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="搜索文章"
          />
        </form>

        <div style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'center' }}>
          {me ? (
            <>
              <Link href="/admin/posts/new" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
                ✍️ 写文章
              </Link>
              <button
                className="btn"
                style={{ padding: '4px 10px 4px 4px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => setOpen(!open)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={me.avatar || '/default-avatar.png'}
                  alt=""
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    objectFit: 'cover', background: 'var(--surface-2)',
                  }}
                />
                <span>{me.nick}</span>
              </button>
              {open && (
                <div
                  className="card"
                  style={{ position: 'absolute', right: 0, top: 42, minWidth: 140, padding: 8, zIndex: 60 }}
                  onMouseLeave={() => setOpen(false)}
                >
                  {me.role === 'ADMIN' && (
                    <>
                      <Link href="/admin" className="nav-link" style={{ display: 'block' }}>
                        🛠 管理后台
                      </Link>
                      <Link href="/admin/posts" className="nav-link" style={{ display: 'block' }}>
                        📝 文章管理
                      </Link>
                      <Link href="/admin/comments" className="nav-link" style={{ display: 'block' }}>
                        💬 评论审核
                      </Link>
                    </>
                  )}
                  <Link href={`/u/${me.id}`} className="nav-link" style={{ display: 'block' }}>
                    👤 我的主页
                  </Link>
                  <Link href="/settings" className="nav-link" style={{ display: 'block' }}>
                    ⚙️ 个人设置
                  </Link>
                  <Link href="/bookmarks" className="nav-link" style={{ display: 'block' }}>
                    🔖 我的收藏
                  </Link>
                  <a href="/api/auth/logout" className="nav-link" style={{ display: 'block' }}>
                    退出登录
                  </a>
                </div>
              )}
            </>
          ) : (
            <Link href="/login" className="btn btn-primary" style={{ padding: '6px 14px' }}>
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

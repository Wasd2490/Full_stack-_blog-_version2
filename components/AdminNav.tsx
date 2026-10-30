'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/admin', label: '概览', exact: true },
  { href: '/admin/posts', label: '文章' },
  { href: '/admin/posts/new', label: '写文章' },
  { href: '/admin/comments', label: '评论审核' },
  { href: '/admin/categories', label: '分类' },
  { href: '/admin/tags', label: '标签' },
  { href: '/admin/columns', label: '专栏' },
  { href: '/admin/moments', label: '动态' },
  { href: '/admin/settings', label: '设置' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="admin-side card" style={{ padding: 10, alignSelf: 'start' }}>
      {ITEMS.map((it) => {
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href)
        return (
          <Link key={it.href} href={it.href} className={active ? 'active' : ''}>
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}

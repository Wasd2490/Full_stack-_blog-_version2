'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '@/lib/toc'

export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    if (!items.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: [0, 1] }
    )
    items.forEach((it) => {
      const el = document.getElementById(it.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [items])

  if (!items.length) return null

  return (
    <nav className="toc" aria-label="文章目录">
      <div className="toc-title">目录</div>
      <ul>
        {items.map((it, i) => (
          <li key={`${it.id}-${i}`} style={{ paddingLeft: (it.depth - 1) * 12 }}>
            <a
              href={`#${it.id}`}
              className={active === it.id ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(it.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                setActive(it.id)
              }}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

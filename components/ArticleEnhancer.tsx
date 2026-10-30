'use client'

import { useEffect } from 'react'

/**
 * 文章阅读增强：
 *  1. 为每个代码块注入「复制」按钮
 *  2. 图片点击放大（轻量 lightbox）
 */
export function ArticleEnhancer() {
  useEffect(() => {
    const root = document.querySelector('.markdown-body')
    if (!root) return

    // 1. 代码复制按钮
    root.querySelectorAll('pre').forEach((pre) => {
      if (pre.querySelector('.code-copy')) return
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'code-copy'
      btn.textContent = '复制'
      btn.setAttribute('aria-label', '复制代码')
      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? ''
        try {
          await navigator.clipboard.writeText(code)
          btn.textContent = '已复制'
          btn.classList.add('copied')
          setTimeout(() => {
            btn.textContent = '复制'
            btn.classList.remove('copied')
          }, 1600)
        } catch {
          btn.textContent = '失败'
          setTimeout(() => (btn.textContent = '复制'), 1600)
        }
      })
      pre.appendChild(btn)
    })

    // 2. 图片点击放大
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.tagName !== 'IMG') return
      const src = (target as HTMLImageElement).src
      const overlay = document.createElement('div')
      overlay.className = 'img-overlay'
      overlay.innerHTML = `<img src="${src}" alt="预览" />`
      overlay.addEventListener('click', () => overlay.remove())
      document.body.appendChild(overlay)
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [])

  return null
}

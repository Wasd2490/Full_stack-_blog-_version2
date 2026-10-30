'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 注册失败不影响正常浏览
    })
  }, [])

  return null
}

'use client'

import { useEffect } from 'react'

/**
 * 阅读量：客户端上报，避免 SSR 预取/爬虫把计数打高。
 * 服务端用原子 UPDATE ... SET viewCount = viewCount + 1，不存在并发覆盖问题。
 */
export function ViewCounter({ postId }: { postId: number }) {
  useEffect(() => {
    const key = `viewed_${postId}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    fetch(`/api/views/${postId}`, { method: 'POST', keepalive: true }).catch(() => {})
  }, [postId])

  return null
}

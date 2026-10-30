'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleLikeAction, toggleBookmarkAction } from '@/lib/actions'

/**
 * 点赞 / 收藏。
 * 初始状态在客户端挂载后从 /api/posts/[id]/state 获取——文章页是 SSG + ISR，
 * 服务端不能读 cookies，否则整页退化为动态渲染。
 */
export function PostActions({ postId, likeCount }: { postId: number; likeCount: number }) {
  const router = useRouter()
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [count, setCount] = useState(likeCount)
  const [loggedIn, setLoggedIn] = useState(false)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch(`/api/posts/${postId}/state`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return
        setLiked(!!j.liked)
        setBookmarked(!!j.bookmarked)
        setCount(j.likeCount)
        setLoggedIn(!!j.loggedIn)
      })
      .catch(() => {})
  }, [postId])

  function needLogin() {
    setMsg('请先登录')
    setTimeout(() => router.push('/login'), 600)
  }

  function onLike() {
    start(async () => {
      const res = await toggleLikeAction(postId)
      if (!res.ok) {
        res.needLogin ? needLogin() : setMsg(res.msg)
        return
      }
      setLiked(res.data!.liked)
      setCount(res.data!.count)
    })
  }

  function onBookmark() {
    start(async () => {
      const res = await toggleBookmarkAction(postId)
      if (!res.ok) {
        res.needLogin ? needLogin() : setMsg(res.msg)
        return
      }
      setBookmarked(res.data!.bookmarked)
    })
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <button className={`btn ${liked ? 'btn-primary' : ''}`} onClick={onLike} disabled={pending}>
        {liked ? '已点赞' : '点赞'} · {count}
      </button>
      <button className={`btn ${bookmarked ? 'btn-primary' : ''}`} onClick={onBookmark} disabled={pending}>
        {bookmarked ? '已收藏' : '收藏'}
      </button>
      <a className="btn" href="#comments">
        评论
      </a>
      {!loggedIn && <span className="muted" style={{ fontSize: 12.5 }}>登录后即可点赞收藏</span>}
      {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
    </div>
  )
}

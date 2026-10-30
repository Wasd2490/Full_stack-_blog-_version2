'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleFollowAction } from '@/lib/actions'

export function FollowButton({
  targetId,
  initialFollowing,
  targetNick,
}: {
  targetId: number
  initialFollowing: boolean
  targetNick: string
}) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  function onClick() {
    start(async () => {
      const res = await toggleFollowAction(targetId)
      if (!res.ok) {
        setMsg(res.msg)
        if (res.needLogin) setTimeout(() => router.push('/login'), 600)
        return
      }
      setFollowing(res.data!.following)
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button className={`btn ${following ? '' : 'btn-primary'}`} onClick={onClick} disabled={pending}>
        {following ? `已关注 ${targetNick}` : `关注 ${targetNick}`}
      </button>
      {msg && <span className="muted" style={{ fontSize: 12.5 }}>{msg}</span>}
    </div>
  )
}

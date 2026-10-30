'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveAlbumAction, addPhotoAction, deletePhotoAction } from '@/lib/admin'

type Album = {
  id: number
  title: string
  description: string | null
  photos: { id: number; url: string; caption: string | null }[]
}

export function AdminAlbumManager({ albums }: { albums: Album[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')
  const [photoUrl, setPhotoUrl] = useState<Record<number, string>>({})

  function create() {
    if (!title.trim()) return
    start(async () => {
      const res = await saveAlbumAction({ title, description: desc })
      if (!res.ok) {
        setMsg(res.msg)
        return
      }
      setTitle('')
      setDesc('')
      router.refresh()
    })
  }

  function addPhoto(albumId: number) {
    const url = (photoUrl[albumId] ?? '').trim()
    if (!url) return
    start(async () => {
      const res = await addPhotoAction(albumId, url)
      if (!res.ok) {
        setMsg(res.msg)
        return
      }
      setPhotoUrl((s) => ({ ...s, [albumId]: '' }))
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="card" style={{ padding: 16, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <input className="input" placeholder="相册标题" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" placeholder="简介（可选）" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className="btn btn-primary" onClick={create} disabled={pending || !title.trim()}>
          新建相册
        </button>
        {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
      </div>

      {albums.length === 0 ? (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p className="muted">暂无相册</p>
        </div>
      ) : (
        albums.map((a) => (
          <section key={a.id} className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{a.title}</h3>
            <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>{a.description || '—'}</p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="input"
                placeholder="图片地址（/uploads/xxx.png 或外链）"
                value={photoUrl[a.id] ?? ''}
                onChange={(e) => setPhotoUrl((s) => ({ ...s, [a.id]: e.target.value }))}
              />
              <button className="btn" onClick={() => addPhoto(a.id)} disabled={pending}>
                添加
              </button>
            </div>

            {a.photos.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>还没有照片</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                {a.photos.map((p) => (
                  <div key={p.id} style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6 }} />
                    <button
                      className="muted"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: 12 }}
                      onClick={() => {
                        if (confirm('删除这张照片？')) {
                          start(async () => {
                            await deletePhotoAction(p.id)
                            router.refresh()
                          })
                        }
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  )
}

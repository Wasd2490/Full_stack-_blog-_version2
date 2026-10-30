'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { saveMomentAction, deleteMomentAction } from '@/lib/admin'
import { timeAgo } from '@/lib/utils'

type Moment = { id: number; content: string; media: string[]; createdAt: string }

export function AdminMomentManager({ moments }: { moments: Moment[] }) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<string[]>([])
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadFiles(files: FileList) {
    const urls: string[] = []
    setMsg('上传中…')
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.ok) {
        urls.push(json.url)
      }
    }
    if (urls.length > 0) {
      setMedia([...media, ...urls])
      setMsg(`已上传 ${urls.length} 个文件`)
    } else {
      setMsg('上传失败')
    }
  }

  function publish() {
    if (!content.trim() && media.length === 0) return
    start(async () => {
      const res = await saveMomentAction({ content, media })
      if (!res.ok) {
        setMsg(res.msg)
        return
      }
      setContent('')
      setMedia([])
      setMsg('已发布')
      router.refresh()
    })
  }

  function remove(id: number) {
    if (!confirm('删除这条动态？')) return
    start(async () => {
      await deleteMomentAction(id)
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <textarea
          className="input"
          rows={3}
          placeholder="此刻的想法…可以配图片或视频"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {/* 已上传的媒体预览 */}
        {media.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
            {media.map((url, i) => (
              <div key={i} style={{ position: 'relative' }}>
                {/\.(mp4|webm|ogg)$/i.test(url) ? (
                  <video src={url} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }} />
                )}
                <button
                  onClick={() => setMedia(media.filter((_, idx) => idx !== i))}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    border: 'none', cursor: 'pointer', fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={publish} disabled={pending || (!content.trim() && media.length === 0)}>
            发布动态
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            📷 添加图片/视频
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) uploadFiles(e.target.files)
              e.target.value = ''
            }}
          />
          {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
        </div>
      </div>

      {moments.length === 0 ? (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p className="muted">暂无动态</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {moments.map((m) => (
            <div key={m.id} className="card" style={{ padding: 14 }}>
              {m.content && <p style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap', fontSize: 14.5 }}>{m.content}</p>}
              {m.media.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6, marginBottom: 8 }}>
                  {m.media.map((url, i) =>
                    /\.(mp4|webm|ogg)$/i.test(url) ? (
                      <video key={i} src={url} style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt="" style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 6 }} />
                    )
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="muted" style={{ fontSize: 12.5 }}>{timeAgo(m.createdAt)}</span>
                <button
                  className="muted"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
                  onClick={() => remove(m.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

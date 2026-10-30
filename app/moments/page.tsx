import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { timeAgo, siteUrl, DEFAULT_AVATAR } from '@/lib/utils'

export const revalidate = 120

export const metadata: Metadata = {
  title: '动态',
  description: '日常记录与碎碎念',
  alternates: { canonical: siteUrl('/moments') },
}

export default async function MomentsPage() {
  const [moments, albums] = await Promise.all([
    prisma.moment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: { author: { select: { nick: true, avatar: true } } },
    }),
    prisma.album.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        photos: { orderBy: { sort: 'asc' }, take: 6 },
        _count: { select: { photos: true } },
      },
    }),
  ])

  return (
    <div className="container-site" style={{ paddingTop: 24, paddingBottom: 40, maxWidth: 780 }}>
      <h1 className="section-title">动态</h1>

      {/* 相册板块 */}
      {albums.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📷 相册</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {albums.map((a) => (
              <div key={a.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{a.title}</h3>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {a._count.photos} 张
                  </span>
                </div>
                {a.description && <p className="muted" style={{ fontSize: 13.5, margin: '0 0 10px' }}>{a.description}</p>}
                {a.photos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                    {a.photos.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={p.url}
                        alt={p.caption || ''}
                        loading="lazy"
                        style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8 }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 说说动态 */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>💬 说说</h2>

      {moments.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p className="muted">还没有发布动态</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {moments.map((m) => {
          let media: string[] = []
          try {
            media = m.media ? JSON.parse(m.media) : []
          } catch {
            media = m.media ? [m.media] : []
          }
          return (
            <article key={m.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.author?.avatar || DEFAULT_AVATAR}
                  alt=""
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', background: 'var(--surface-2)' }}
                />
                <strong style={{ fontSize: 14.5 }}>{m.author?.nick ?? '博主'}</strong>
                <span className="muted" style={{ fontSize: 12.5 }}>{timeAgo(m.createdAt)}</span>
              </div>

              {m.content && <p style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap', fontSize: 15 }}>{m.content}</p>}

              {media.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                  {media.map((src, i) =>
                    /\.(mp4|webm|ogg)$/i.test(src) ? (
                      <video key={i} src={src} controls style={{ width: '100%', borderRadius: 8 }} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt=""
                        loading="lazy"
                        style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 220 }}
                      />
                    )
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

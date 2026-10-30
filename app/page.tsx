import Link from 'next/link'
import { prisma } from '@/lib/db'
import { PostCard } from '@/components/PostCard'
import { BlogSidebar } from '@/components/BlogSidebar'
import { getSetting, SETTINGS } from '@/lib/db'
import { TypeWriter } from '@/components/TypeWriter'
import { HeroCanvas } from '@/components/HeroCanvas'

export const revalidate = 60

const PAGE_SIZE = 5

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || '1'))
  const skip = (page - 1) * PAGE_SIZE

  const [posts, pinned, total, moments, notice, hotPosts, totalViews, totalComments, totalTags] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE,
      skip,
      select: {
        id: true, title: true, slug: true, excerpt: true, publishedAt: true,
        viewCount: true, likeCount: true, commentCount: true, wordCount: true,
        category: { select: { name: true, slug: true } },
        author: { select: { nick: true, avatar: true } },
        tags: { select: { tag: { select: { name: true, slug: true } } } },
      },
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED', pinned: true },
      orderBy: [{ publishedAt: 'desc' }],
      take: 2,
      select: {
        id: true, title: true, slug: true, excerpt: true, publishedAt: true,
        viewCount: true, likeCount: true, commentCount: true, wordCount: true,
        category: { select: { name: true, slug: true } },
        author: { select: { nick: true, avatar: true } },
        tags: { select: { tag: { select: { name: true, slug: true } } } },
      },
    }),
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
    prisma.moment.findMany({ orderBy: { createdAt: 'desc' }, take: 3 }),
    getSetting(SETTINGS.SITE_NOTICE, ''),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ viewCount: 'desc' }, { likeCount: 'desc' }],
      take: 5,
      select: { id: true, title: true, slug: true, viewCount: true },
    }),
    prisma.post.aggregate({ _sum: { viewCount: true } }),
    prisma.comment.count({ where: { status: 'APPROVED' } }),
    prisma.tag.count(),
  ])

  const shape = (p: any) => ({
    ...p,
    tags: p.tags?.map((t: any) => t.tag) ?? [],
  })

  const stats = [
    { label: '文章', value: total, icon: '📝' },
    { label: '阅读', value: totalViews._sum.viewCount || 0, icon: '👁' },
    { label: '评论', value: totalComments, icon: '💬' },
    { label: '标签', value: totalTags, icon: '🏷' },
  ]

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="container-site" style={{ paddingTop: 24, paddingBottom: 40 }}>
      {/* 整屏 Hero 视频画布 */}
      <section className="hero-fullscreen">
        <HeroCanvas />
        <div className="hero-content" style={{ color: 'white' }}>
          <h1 style={{ fontSize: 48, fontWeight: 900, marginBottom: 16, background: 'linear-gradient(135deg, #fbcfe8, #f472b6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: 'none' }}>
            characteristic · 博客
          </h1>
          <p style={{ fontSize: 24, marginBottom: 12, opacity: 1, color: '#fbcfe8', minHeight: 36, fontWeight: 600 }}>
            <TypeWriter />
          </p>
          <p style={{ fontSize: 16, marginBottom: 32, opacity: 0.8, color: 'white' }}>
            在星空下持续写作
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/blog" className="btn btn-primary">浏览全部文章 · {total}</Link>
            <Link href="/archive" className="btn" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>归档时间线</Link>
            <a href="/feed.xml" className="btn" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>订阅 RSS</a>
          </div>
          {notice && (
            <p style={{ marginTop: 24, fontSize: 14, color: 'white', background: 'rgba(0,0,0,0.3)', padding: '10px 20px', borderRadius: 999, backdropFilter: 'blur(10px)' }}>
              📢 {notice}
            </p>
          )}
          <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', animation: 'bounce 2s infinite' }}>
            <span style={{ fontSize: 24, opacity: 0.7, color: 'white' }}>↓</span>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20, alignItems: 'start' }} className="home-grid">
        <div style={{ display: 'grid', gap: 14 }}>
          {pinned.length > 0 && (
            <>
              <h2 className="section-title">📌 置顶推荐</h2>
              {pinned.map((p) => (
                <PostCard key={p.id} post={{ ...shape(p), pinned: true }} />
              ))}
            </>
          )}

          <h2 className="section-title" style={{ marginTop: pinned.length ? 8 : 0 }}>✨ 最新文章</h2>
          {posts.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <p className="muted">还没有发布文章，去后台写第一篇吧。</p>
              <Link href="/admin/posts/new" className="btn btn-primary" style={{ marginTop: 12 }}>写文章</Link>
            </div>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={shape(p)} />)
          )}

          {moments.length > 0 && (
            <section style={{ marginTop: 24 }}>
              <h2 className="section-title">💭 最近动态</h2>
              <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
                {moments.map((m) => (
                  <div key={m.id} style={{ fontSize: 14, padding: '8px 0', borderBottom: '1px dashed var(--border)' }}>
                    <p style={{ margin: 0 }}>{m.content}</p>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {m.createdAt.toISOString().slice(0, 10)}
                    </span>
                  </div>
                ))}
                <Link href="/moments" className="muted" style={{ fontSize: 13 }}>查看全部动态 →</Link>
              </div>
            </section>
          )}
        </div>

        <div style={{ display: 'grid', gap: 16, position: 'sticky', top: 80 }}>
          {hotPosts.length > 0 && (
            <div className="card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, paddingLeft: 10, borderLeft: '3px solid var(--brand)' }}>
                🔥 热门文章
              </h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {hotPosts.map((p, i) => (
                  <Link key={p.id} href={`/blog/${p.slug}`} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13.5 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                      background: i < 3 ? 'var(--brand)' : 'var(--surface-2)',
                      color: i < 3 ? '#fff' : 'var(--text-muted)',
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <BlogSidebar />
        </div>
      </div>

      <style>{`
        @media(max-width:900px){.home-grid{grid-template-columns:1fr !important;}}
        .hero-section { background: linear-gradient(135deg, var(--brand-light) 0%, var(--surface) 100%); }
        .section-title { font-size: 18px; font-weight: 700; padding-left: 10px; border-left: 3px solid var(--brand); }
      `}</style>
    </div>
  )
}

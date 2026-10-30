import Link from 'next/link'

export function SiteFooter({ siteName, desc }: { siteName: string; desc: string }) {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: 48, padding: '40px 0 28px', background: 'var(--surface)' }}>
      <div className="container-site" style={{ fontSize: 13.5 }}>
        {/* 三列布局 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 32, marginBottom: 28 }} className="footer-grid">
          {/* 品牌 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, var(--brand), #f9a8d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14,
              }}>🌸</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{siteName}</span>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>{desc}</p>
          </div>

          {/* 内容 */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>内容</div>
            <div style={{ display: 'grid', gap: 6 }}>
              <Link href="/blog" className="muted" style={{ fontSize: 13 }}>全部文章</Link>
              <Link href="/archive" className="muted" style={{ fontSize: 13 }}>归档</Link>
              <Link href="/column" className="muted" style={{ fontSize: 13 }}>专栏</Link>
              <Link href="/moments" className="muted" style={{ fontSize: 13 }}>动态</Link>
            </div>
          </div>

          {/* 订阅 */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>订阅</div>
            <div style={{ display: 'grid', gap: 6 }}>
              <a href="/feed.xml" className="muted" style={{ fontSize: 13 }}>RSS</a>
              <a href="/sitemap.xml" className="muted" style={{ fontSize: 13 }}>站点地图</a>
              <Link href="/search" className="muted" style={{ fontSize: 13 }}>搜索</Link>
            </div>
          </div>
        </div>

        {/* 版权 */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: 16,
          textAlign: 'center',
          fontSize: 12.5,
        }}>
          <span className="muted">
            © {new Date().getFullYear()} {siteName}
            <br />
            仅供学习 · 著作权归 @谁暖了冬季 所有
          </span>
        </div>
      </div>

      <style>{`
        @media(max-width:640px){
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </footer>
  )
}

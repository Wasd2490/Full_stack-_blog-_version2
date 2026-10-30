import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminPage } from '@/lib/auth'
import { AdminNav } from '@/components/AdminNav'

export const metadata: Metadata = {
  title: { default: '管理后台', template: '%s | 管理后台' },
  robots: { index: false, follow: false },
}

/**
 * 后台鉴权：在 layout 层做服务端校验。
 * 为什么不用 middleware —— middleware 跑在 Edge Runtime，拿不到 Prisma，
 * 只能判断「有没有 cookie」，无法判断角色，因此真正的权限校验放在 layout + 每个 Action 内。
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage('/admin')

  return (
    <div className="container-site" style={{ paddingTop: 20, paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ fontSize: 19, fontWeight: 700 }}>管理后台</h1>
        <Link href="/" className="btn">
          返回前台
        </Link>
      </div>
      <div className="admin-shell">
        <AdminNav />
        <div style={{ minWidth: 0 }}>{children}</div>
      </div>
    </div>
  )
}

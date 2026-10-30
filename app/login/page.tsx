import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { LoginForm } from '@/components/LoginForm'

export const metadata: Metadata = {
  title: '登录',
  description: '登录后可以评论、点赞与收藏',
  robots: { index: false, follow: false },
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams
  const user = await getSessionUser()
  if (user) redirect(sp.next || '/')

  return (
    <div className="container-site" style={{ paddingTop: 40, paddingBottom: 40, maxWidth: 420 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 18, textAlign: 'center' }}>登录</h1>
      <LoginForm next={sp.next || '/'} />
    </div>
  )
}

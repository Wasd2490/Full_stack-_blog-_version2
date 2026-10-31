import type { Metadata } from 'next'
import './globals.css'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'
import { VisualEffects } from '@/components/VisualEffects'
import { ReadingProgress } from '@/components/ReadingProgress'
import { GlobalVideoBg } from '@/components/GlobalVideoBg'
import { MusicPlayer } from '@/components/MusicPlayer'
import { siteUrl } from '@/lib/utils'

const SITE_NAME = process.env.SITE_NAME || 'characteristic·博客'
const SITE_DESC = process.env.SITE_DESCRIPTION || '在星空下持续写作'
const AUTHOR = process.env.AUTHOR_NAME || SITE_NAME

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} · 技术博客`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: ['博客', '技术', '编程', SITE_NAME],
  authors: [{ name: AUTHOR }],
  creator: AUTHOR,
  publisher: SITE_NAME,
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: `${SITE_NAME} RSS` }],
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESC,
    url: siteUrl(),
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESC,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  manifest: '/manifest.json',
}

/**
 * 注意：这里刻意不调用 getSessionUser()。
 * 一旦 layout 读了 cookies，整站都会退化成动态渲染，文章页就拿不到 SSG + ISR。
 * 登录态改为由客户端组件请求 /api/me 获取。
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl(),
    description: SITE_DESC,
    inLanguage: 'zh-CN',
    author: {
      '@type': 'Person',
      name: AUTHOR,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: siteUrl('/search?q={search_term_string}'),
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        <GlobalVideoBg />
        <VisualEffects />
        <ReadingProgress />
        <SiteHeader siteName={SITE_NAME} />
        <main style={{ minHeight: 'calc(100vh - 200px)', position: 'relative', zIndex: 1 }}>{children}</main>
        <SiteFooter siteName={SITE_NAME} desc={SITE_DESC} />
        <MusicPlayer />
      </body>
    </html>
  )
}

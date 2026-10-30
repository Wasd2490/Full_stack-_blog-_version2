import { pinyin } from 'pinyin-pro'

/**
 * 生成 URL 友好的 slug：中文转拼音，英文数字保留，最终只含 [a-z0-9-]。
 *
 * 为什么不用中文 slug：中文路径在 URL 里会被 percent-encode 成长串，
 * 且部分运行时/反向代理对非 ASCII 路由的解码不一致（实测会 404/500）。
 * 拼音 slug 可读性接近，对 Google / 百度收录同样友好，兼容性更稳。
 */
export function slugify(input: string, fallback = 'post'): string {
  const withPinyin = input.replace(/[\u4e00-\u9fa5]+/g, (m) =>
    ` ${pinyin(m, { toneType: 'none', type: 'array' }).join('-')} `
  )
  const s = withPinyin
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return s || `${fallback}-${Date.now().toString(36)}`
}

/** 计算正文字数（中文按字，英文按词） */
export function countWords(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_\-|>]/g, ' ')
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length
  return cjk + en
}

/** 自动摘要：剥离 Markdown 标记后截断 */
export function makeExcerpt(markdown: string, len = 120): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > len ? text.slice(0, len) + '…' : text
}

/** 预估阅读时长（分钟） */
export function readingTime(words: number): number {
  return Math.max(1, Math.round(words / 300))
}

export function formatDate(d: Date | string | null | undefined, style: 'date' | 'datetime' = 'date'): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  const base = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
  if (style === 'date') return base
  return `${base} ${p(date.getHours())}:${p(date.getMinutes())}`
}

/** 相对时间，用于评论/动态 */
export function timeAgo(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const diff = Date.now() - date.getTime()
  const min = 60_000, hour = 60 * min, day = 24 * hour
  if (diff < min) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return formatDate(date)
}

/**
 * 默认头像：内联为 data URI，不再走 /default-avatar.svg 的网络请求。
 *
 * 为什么内联：Chrome 会对页面里的图片资源做 link preload，而默认头像只在
 * 「用户没设头像」时才用到，多数页面加载后几秒内都不会真正渲染它，于是控制台
 * 反复报 "was preloaded using link preload but not used"。内联后请求消失，
 * 顺带省掉一次 RTT。原文件 public/default-avatar.svg 保留作备份。
 */
export const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='32' fill='%23e5e7eb'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%239aa3b2'/%3E%3Cpath d='M8 60c0-13.255 10.745-22 24-22s24 8.745 24 22z' fill='%239aa3b2'/%3E%3C/svg%3E"

export function siteUrl(path = '/'): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return base + (path.startsWith('/') ? path : `/${path}`)
}

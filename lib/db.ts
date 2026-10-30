import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/** 站点配置读取，带进程内缓存 */
const settingCache = new Map<string, { value: string; at: number }>()
const SETTING_TTL = 30_000

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const hit = settingCache.get(key)
  const now = Date.now()
  if (hit && now - hit.at < SETTING_TTL) return hit.value
  try {
    const row = await prisma.setting.findUnique({ where: { key } })
    const value = row?.value ?? fallback
    settingCache.set(key, { value, at: now })
    return value
  } catch {
    return fallback
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
  settingCache.set(key, { value, at: Date.now() })
}

export const SETTINGS = {
  COMMENT_REVIEW: 'comment.review', // "on" | "off"
  SITE_NOTICE: 'site.notice',
} as const

/** 评论是否需要审核 */
export async function commentNeedsReview(): Promise<boolean> {
  return (await getSetting(SETTINGS.COMMENT_REVIEW, 'off')) === 'on'
}

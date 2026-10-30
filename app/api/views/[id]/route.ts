import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/** 阅读量：原子递增，避免读-改-写造成的并发覆盖 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  if (!Number.isFinite(postId)) return NextResponse.json({ ok: false }, { status: 400 })

  const res = await prisma.post.updateMany({
    where: { id: postId, status: 'PUBLISHED' },
    data: { viewCount: { increment: 1 } },
  })

  return NextResponse.json({ ok: true, updated: res.count })
}

import { prisma } from '@/lib/db'
import { AdminMomentManager } from '@/components/AdminMomentManager'

export const dynamic = 'force-dynamic'

export default async function AdminMomentsPage() {
  const rows = await prisma.moment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, content: true, media: true, createdAt: true },
  })

  return (
    <AdminMomentManager
      moments={rows.map((m) => {
        let media: string[] = []
        try {
          media = m.media ? JSON.parse(m.media) : []
        } catch {
          media = m.media ? [m.media] : []
        }
        return { id: m.id, content: m.content, media, createdAt: m.createdAt.toISOString() }
      })}
    />
  )
}

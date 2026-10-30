import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { UserSettingsForm } from '@/components/UserSettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, nick: true, email: true, avatar: true, bio: true },
  })

  if (!fullUser) redirect('/login')

  return (
    <div className="container-site" style={{ paddingTop: 24, paddingBottom: 40, display: 'flex', justifyContent: 'center' }}>
      <UserSettingsForm user={fullUser} />
    </div>
  )
}

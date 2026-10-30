import { getSetting, SETTINGS } from '@/lib/db'
import { AdminSettings } from '@/components/AdminSettings'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const [review, notice] = await Promise.all([
    getSetting(SETTINGS.COMMENT_REVIEW, 'off'),
    getSetting(SETTINGS.SITE_NOTICE, ''),
  ])

  return <AdminSettings commentReview={review === 'on'} siteNotice={notice} />
}

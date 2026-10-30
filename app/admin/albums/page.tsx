import { redirect } from 'next/navigation'

// 相册管理已合并到动态管理
export default function AdminAlbumsPage() {
  redirect('/admin/moments')
}

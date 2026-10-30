import { redirect } from 'next/navigation'

// 相册已合并到动态页面
export default function AlbumPage() {
  redirect('/moments')
}

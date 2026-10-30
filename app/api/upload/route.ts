import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { getSessionUser } from '@/lib/auth'

/**
 * 图片上传：默认写本地 public/uploads。
 * 生产环境建议改为对象存储（OSS / S3 / Supabase Storage），
 * 只需把 writeFile 换成 SDK 的 putObject，并把返回的 URL 换成 CDN 地址即可，
 * 调用方（编辑器）不用改动。
 */
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ ok: false, msg: '请先登录' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ ok: false, msg: '没有权限' }, { status: 403 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ ok: false, msg: '请求格式错误' }, { status: 400 })
  }

  const file = form.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ ok: false, msg: '没有文件' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, msg: '文件不能超过 5MB' }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ ok: false, msg: '仅支持 png/jpg/gif/webp/svg' }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const ext = file.type === 'image/svg+xml' ? '.svg' : path.extname(file.name) || '.png'
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, name), bytes)

  return NextResponse.json({ ok: true, url: `/uploads/${name}` })
}

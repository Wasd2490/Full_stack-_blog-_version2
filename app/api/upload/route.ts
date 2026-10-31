import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { getSessionUser } from '@/lib/auth'

/**
 * 文件上传：默认写本地 public/uploads。
 * 生产环境建议改为对象存储（OSS / S3 / Supabase Storage），
 * 只需把 writeFile 换成 SDK 的 putObject，并把返回的 URL 换成 CDN 地址即可，
 * 调用方（编辑器、头像、动态）不用改动。
 *
 * 权限模型（V2.5）：
 *   登录用户     → 可传图片（头像，≤2MB）
 *   管理员 ADMIN → 可传图片（≤5MB）与视频（≤50MB，用于动态/相册）
 */
const MAX_IMAGE_ADMIN = 5 * 1024 * 1024 // 5MB
const MAX_IMAGE_USER = 2 * 1024 * 1024 // 2MB（头像足够）
const MAX_VIDEO = 50 * 1024 * 1024 // 50MB

const IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogg',
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ ok: false, msg: '请先登录' }, { status: 401 })

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

  const isAdmin = user.role === 'ADMIN'
  const isVideo = VIDEO_TYPES.includes(file.type)
  const isImage = IMAGE_TYPES.includes(file.type)

  if (isVideo) {
    // 视频仅管理员可传（动态 / 相册）
    if (!isAdmin) {
      return NextResponse.json({ ok: false, msg: '没有权限上传视频' }, { status: 403 })
    }
    if (file.size > MAX_VIDEO) {
      return NextResponse.json({ ok: false, msg: '视频不能超过 50MB' }, { status: 400 })
    }
  } else if (isImage) {
    const limit = isAdmin ? MAX_IMAGE_ADMIN : MAX_IMAGE_USER
    if (file.size > limit) {
      return NextResponse.json({
        ok: false,
        msg: `图片不能超过 ${limit / 1024 / 1024}MB`,
      }, { status: 400 })
    }
  } else {
    return NextResponse.json({
      ok: false,
      msg: '仅支持 png/jpg/gif/webp/svg 图片' + (isAdmin ? ' 与 mp4/webm/ogg 视频' : ''),
    }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const ext = EXT_BY_TYPE[file.type] || path.extname(file.name) || '.png'
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, name), bytes)

  return NextResponse.json({ ok: true, url: `/uploads/${name}` })
}

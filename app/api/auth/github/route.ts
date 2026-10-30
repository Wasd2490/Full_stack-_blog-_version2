import { NextResponse } from 'next/server'

/** 回调地址严格取自环境变量，避免 V1 里把 127.0.0.1 写死的踩坑重演 */
export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID
  const callback = process.env.GITHUB_CALLBACK

  if (!clientId || !callback) {
    return NextResponse.json(
      { ok: false, msg: '未配置 GITHUB_CLIENT_ID / GITHUB_CALLBACK' },
      { status: 500 }
    )
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback,
    scope: 'read:user user:email',
  })
  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`)
}

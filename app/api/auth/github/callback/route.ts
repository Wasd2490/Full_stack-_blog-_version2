import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createSession, hashPassword } from '@/lib/auth'

type GithubUser = {
  id: number
  login: string
  email: string | null
  avatar_url: string | null
  name: string | null
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/login?err=no_code', req.url))

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const callback = process.env.GITHUB_CALLBACK

  try {
    // 1. 换 access_token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: callback }),
    })
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string }
    if (!tokenJson.access_token) {
      return NextResponse.redirect(new URL('/login?err=github_token', req.url))
    }

    // 2. 拉用户信息
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'my-blog-v2',
      },
    })
    const gh = (await userRes.json()) as GithubUser
    if (!gh?.id) return NextResponse.redirect(new URL('/login?err=github_user', req.url))

    const githubId = String(gh.id)
    const email = gh.email || `${gh.login}@github.local`

    // 3. 先按 githubId 找，再按 email 归并，都没有则创建
    let user = await prisma.user.findUnique({ where: { githubId } })
    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email } })
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { githubId, githubLogin: gh.login, avatar: byEmail.avatar || gh.avatar_url },
        })
      } else {
        const total = await prisma.user.count()
        user = await prisma.user.create({
          data: {
            email,
            nick: gh.name || gh.login,
            password: hashPassword(Math.random().toString(36).slice(2) + Date.now()),
            avatar: gh.avatar_url,
            githubId,
            githubLogin: gh.login,
            role: total === 0 ? 'ADMIN' : 'USER',
          },
        })
      }
    }

    await createSession({
      id: user.id,
      email: user.email,
      nick: user.nick,
      avatar: user.avatar,
      role: user.role,
    })

    return NextResponse.redirect(new URL('/', req.url))
  } catch (e) {
    console.error('[github oauth]', e)
    return NextResponse.redirect(new URL('/login?err=github_failed', req.url))
  }
}

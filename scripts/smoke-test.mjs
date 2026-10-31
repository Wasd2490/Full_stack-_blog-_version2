#!/usr/bin/env node
/**
 * 冒烟测试 —— 一次性体检：数据层 / 页面 / SEO / 搜索 / 认证 / API
 *
 * 用法（先确保站点已在跑）：
 *   node scripts/smoke-test.mjs                 # 默认 http://localhost:3005
 *   node scripts/smoke-test.mjs http://localhost:3000
 *
 * 退出码 0 = 全部通过，1 = 有失败项
 */

import { PrismaClient } from '@prisma/client'

const BASE = (process.argv[2] || 'http://localhost:3005').replace(/\/$/, '')

let pass = 0
let fail = 0
const failures = []

function ok(name, extra = '') {
  pass++
  console.log(`  PASS  ${name}${extra ? '  ' + extra : ''}`)
}
function bad(name, detail = '') {
  fail++
  failures.push(`${name}${detail ? ' :: ' + detail : ''}`)
  console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`)
}
function section(t) {
  console.log(`\n--- ${t} ---`)
}

async function status(path) {
  try {
    const r = await fetch(BASE + path, { redirect: 'manual' })
    return { code: r.status, ok: r.ok, body: await r.text() }
  } catch (e) {
    return { code: 0, ok: false, body: '', err: String(e.message || e) }
  }
}

// ────────────────────────────────────────────────────────────
const prisma = new PrismaClient()

console.log(`\n============================================`)
console.log(` Blog V2 smoke test  ->  ${BASE}`)
console.log(`============================================`)

// 1. 数据层
section('1. 数据库')
try {
  const [users, posts, cats, tags, moments, comments, columns, albums] =
    await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.category.count(),
      prisma.tag.count(),
      prisma.moment.count(),
      prisma.comment.count(),
      prisma.column.count(),
      prisma.album.count(),
    ])
  console.log(
    `        用户${users} 文章${posts} 分类${cats} 标签${tags} 动态${moments} ` +
      `评论${comments} 专栏${columns} 相册${albums}`
  )
  posts > 0 ? ok('文章数据存在', `${posts} 篇`) : bad('文章数据存在', '0 篇')
  users > 0 ? ok('用户数据存在', `${users} 个`) : bad('用户数据存在', '0 个')

  const pub = await prisma.post.count({ where: { status: 'PUBLISHED' } })
  pub > 0 ? ok('已发布文章', `${pub} 篇`) : bad('已发布文章', '0 篇')

  const admin = await prisma.user.count({ where: { role: 'ADMIN' } })
  admin > 0 ? ok('管理员账号', `${admin} 个`) : bad('管理员账号', '无')

  const badSlug = await prisma.post.count({
    where: { slug: { not: { equals: '' } } },
  })
  const nonAscii = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "Post" WHERE slug ~ '[^a-zA-Z0-9_-]'`
  )
  nonAscii[0].n === 0
    ? ok('slug 全为 ASCII（拼音化生效）')
    : bad('slug 全为 ASCII', `${nonAscii[0].n} 篇含非 ASCII`)
} catch (e) {
  bad('数据库连接', String(e.message).split('\n')[0])
}

// 1b. V2.5 专栏审核字段
section('1b. 专栏审核字段')
try {
  const col = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM information_schema.columns
     WHERE table_name = 'Column' AND column_name = 'status'`
  )
  col[0].n === 1
    ? ok('Column.status 列已建（迁移生效）')
    : bad('Column.status 列已建', '未找到，请跑 prisma migrate deploy')

  const statuses = await prisma.column.groupBy({ by: ['status'], _count: { _all: true } })
  console.log(
    '        专栏状态：' +
      (statuses.map((s) => `${s.status}=${s._count._all}`).join(' ') || '（无专栏）')
  )
  const illegal = await prisma.column.count({
    where: { status: { notIn: ['DRAFT', 'PENDING', 'PUBLISHED'] } },
  })
  illegal === 0 ? ok('专栏状态值合法') : bad('专栏状态值合法', `${illegal} 条异常`)
} catch (e) {
  bad('专栏审核字段检查', String(e.message).split('\n')[0])
}

// 2. 页面可访问性
section('2. 页面 HTTP 状态')
const pages = [
  ['/', 200, '首页'],
  ['/blog', 200, '文章列表'],
  ['/archive', 200, '归档'],
  ['/column', 200, '专栏'],
  ['/moments', 200, '动态'],
  ['/album', 307, '相册（应跳转 /moments）'],
  ['/settings', 307, '个人设置（未登录应跳转）'],
  ['/login', 200, '登录页'],
  ['/search?q=ROS2', 200, '搜索页'],
  ['/feed.xml', 200, 'RSS'],
  ['/sitemap.xml', 200, 'Sitemap'],
  ['/robots.txt', 200, 'robots'],
  ['/u/1', 200, '用户主页'],
  ['/admin', 307, '后台（未登录应跳转）'],
]
for (const [p, want, name] of pages) {
  const r = await status(p)
  r.code === want
    ? ok(name, `${p} -> ${r.code}`)
    : bad(name, `${p} -> ${r.code}（期望 ${want}）`)
}

// 2b. 首页 V2.5 新版要素
section('2b. 首页新版要素')
const home = await status('/')
if (home.code !== 200) {
  bad('首页 200', String(home.code))
} else {
  const homeChecks = [
    ['整屏 Hero', home.body.includes('hero-fullscreen')],
    ['视频背景组件', home.body.includes('/videos/bg3.mp4')],
    ['热门文章榜', home.body.includes('热门文章')],
    ['板块标题样式', home.body.includes('section-title')],
    ['粉色主题变量', home.body.includes('#ec4899')],
    ['音乐播放器', home.body.includes('/music/1.mp3')],
  ]
  for (const [n, hit] of homeChecks) hit ? ok(n) : bad(n, '未出现')
}

// 3. 文章详情 + SEO
section('3. 文章详情与 SEO')
const first = await prisma.post.findFirst({
  where: { status: 'PUBLISHED' },
  select: { slug: true, title: true },
  orderBy: { publishedAt: 'desc' },
})
if (!first) {
  bad('找到已发布文章', '无')
} else {
  const r = await status('/blog/' + encodeURIComponent(first.slug))
  if (r.code !== 200) {
    bad('文章详情 200', `${r.code}`)
  } else {
    ok('文章详情 200', `/blog/${first.slug}`)
    const checks = [
      ['BlogPosting JSON-LD', r.body.includes('"@type":"BlogPosting"')],
      ['canonical', /rel="canonical"/.test(r.body)],
      ['og:title', r.body.includes('og:title')],
      ['description', r.body.includes('name="description"')],
      ['正文容器 markdown-body', r.body.includes('markdown-body')],
      ['目录 TOC', r.body.includes('toc-title') || r.body.includes('id="toc"')],
      ['评论区锚点', r.body.includes('id="comments"')],
    ]
    for (const [n, hit] of checks) hit ? ok(n) : bad(n, '未出现')
    r.body.includes(first.title.slice(0, 8))
      ? ok('标题服务端直出')
      : bad('标题服务端直出', 'HTML 中未找到标题')
  }
}

// 4. 搜索
section('4. 搜索')
const s = await status('/search?q=' + encodeURIComponent('树莓派'))
s.code === 200 ? ok('搜索页 200') : bad('搜索页 200', String(s.code))
s.body.includes('<mark')
  ? ok('关键词高亮 <mark>')
  : bad('关键词高亮 <mark>', '未找到高亮标记')

// 5. 认证 + 后台
section('5. 认证与后台')
const EMAIL = process.env.SMOKE_EMAIL || 'test@test.com'
const PWD = process.env.SMOKE_PWD || 'admin12345'
let cookie = ''
try {
  const lr = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, pwd: PWD }),
  })
  const lj = await lr.json()
  if (lr.status === 200 && lj.ok) {
    ok('管理员登录', EMAIL)
    cookie = (lr.headers.getSetCookie?.() || [])
      .map((c) => c.split(';')[0])
      .join('; ')
  } else {
    bad('管理员登录', `HTTP ${lr.status} ${JSON.stringify(lj).slice(0, 80)}`)
  }
} catch (e) {
  bad('管理员登录', String(e.message))
}

if (cookie) {
  for (const [p, name] of [
    ['/admin', '后台首页'],
    ['/admin/posts', '文章管理'],
    ['/admin/posts/new', '新建文章'],
    ['/admin/comments', '评论审核'],
    ['/admin/categories', '分类管理'],
    ['/admin/tags', '标签管理'],
    ['/admin/columns', '专栏管理'],
    ['/admin/moments', '动态管理'],
    ['/admin/settings', '站点设置'],
    ['/settings', '个人设置'],
    ['/bookmarks', '我的收藏'],
  ]) {
    const r = await fetch(BASE + p, { headers: { cookie }, redirect: 'manual' })
    r.status === 200 ? ok(name, `${p}`) : bad(name, `${p} -> ${r.status}`)
  }
  // 相册管理已合并到动态管理，应跳转
  const alb = await fetch(BASE + '/admin/albums', { headers: { cookie }, redirect: 'manual' })
  alb.status === 307
    ? ok('相册管理跳转 307', '/admin/albums')
    : bad('相册管理应跳转 307', `实际 ${alb.status}`)
  const me = await fetch(BASE + '/api/me', { headers: { cookie } })
  const mj = await me.json()
  mj.user ? ok('/api/me 返回用户', mj.user.nick) : bad('/api/me', JSON.stringify(mj).slice(0, 60))
} else {
  console.log('  SKIP  后台页面（登录失败，跳过）')
}

// 6. API
section('6. API')
const v1 = await fetch(BASE + '/api/views/1', { method: 'POST' })
v1.ok ? ok('阅读量递增 /api/views/1') : bad('阅读量递增', `HTTP ${v1.status}`)
const st = await status('/api/posts/1/state')
st.code === 200 ? ok('文章互动状态 /api/posts/1/state') : bad('互动状态', String(st.code))
const badLogin = await fetch(BASE + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, pwd: 'definitely-wrong' }),
})
badLogin.status === 401
  ? ok('错误密码被拒绝 401')
  : bad('错误密码应 401', `实际 ${badLogin.status}`)

// 结果
await prisma.$disconnect()
console.log(`\n============================================`)
console.log(` 通过 ${pass}   失败 ${fail}`)
if (fail) {
  console.log(`\n 失败项：`)
  failures.forEach((f) => console.log(`   - ${f}`))
}
console.log(`============================================\n`)
process.exit(fail ? 1 : 0)

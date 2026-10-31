# 更新日志

本项目所有显著变更记录在此文件。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

---

## [2.5.3] — 2026-10-31 · 音乐播放器 UI 重做

按用户截图重做控制排布局（原来是三个小按钮挤在一个粉色圆里）：

- **横排四钮**：`⏮ 上一曲`（白色 44px 圆）→ `▶ 播放`（粉色渐变 **64px** 大圆）→
  `⏭ 下一曲`（白色 44px 圆）→ `☰ 歌单`（白色 44px 圆），间距 14px。
- emoji 图标（⏮▶☰）全部换成**内联 SVG**（跟随 `currentColor`，跨平台渲染一致）。
- 白色圆钮粉色图标 + 柔和粉色投影，悬停上浮 2px、按下回弹。
- 进度条加宽到与按钮排等宽（212px），歌名胶囊移到进度条上方。
- **顺手修了一个自动连播 bug**：`ended` 监听在挂载时注册，闭包捕获了初始
  `currentTrack=0` 和 `isPlaying=false`，导致任何歌播完都只会切到第 2 首且不自动播放。
  改用 `trackRef` / `isPlayingRef` 读取实时值。

---

## [2.5.2] — 2026-10-31 · 全站站名统一为 characteristic

在 2.5.1 只改首屏的基础上，把站名与站描述**全站统一**（账号昵称除外）。

- `.env` / `.env.example`：`SITE_NAME` → `characteristic·博客`、
  `SITE_DESCRIPTION` → `在星空下持续写作`。
  `AUTHOR_NAME` 保持 `谁暖了冬季`（作者署名属用户名称，不随站名改）。
- 代码里的兜底默认值同步更新：`app/layout.tsx`、`app/page.tsx`、
  `app/feed.xml/route.ts`、`app/blog/[slug]/page.tsx`。
- 页脚版权署名保持 `@谁暖了冬季`（署名 = 用户名称，不随站名改）。
- PWA `public/manifest.json`：name / description 同步，主题色与图标由旧蓝
  `#2563eb` 改为 2.5 的粉 `#ec4899`。
- **保持不变**：数据库里账号 `test@test.com` 的昵称仍是「谁暖了冬季」（用户名称不改）。
- 影响范围：导航栏、页脚、浏览器标签页 `<title>`、OG、文章 JSON-LD、RSS 订阅源标题。

---

## [2.5.1] — 2026-10-31 · 首页 Hero 文案

- 首屏大标题改为 `characteristic·博客`；副标题改为 `在星空下持续写作`。
- 打字机轮播文案改为 `characteristic·全栈` / `characteristic·单片机` / `characteristic·机器视觉`。
- 这三处用 `app/page.tsx` 顶部的 `HERO_TITLE` / `HERO_SUBTITLE` / `HERO_TYPED` 常量，
  与全站站名解耦，便于单独调整首屏文案。

---

## [2.5.0] — 2026-10-31 · 视觉改版 + 专栏审核 + 用户中心

对齐 `dist/my_blog_V2.5_src` 的功能与 UI 布局。

### 视觉与交互

- **主题换成粉色系**：品牌色由蓝（`#2563eb`）改为粉（`#ec4899`），圆角 12px → 20px，
  阴影换成柔和粉色，并新增 `--shadow-hover`、`.section-title`（左侧 4px 粗边框板块标题）。
- 导航栏毛玻璃增强（blur 12 → 20px）+ 粉色投影；按钮圆角 12px、悬停上浮；标签 chip 去边框、悬停变深粉。
- 文章卡片加大内边距（24/28px），悬停上浮 4px 并附**流光扫过**效果；新增滚动入场动画。
- 首屏改为**整屏视频 Hero**（`HeroCanvas` + bg3.mp4）：渐变标题 + 打字机 + 站点统计（文章/阅读/评论/标签）+ 下滑提示。
- 新增 `GlobalVideoBg`（全站视频背景，bg3→bg2→bg1 轮播 + 半透明遮罩）、
  `VisualEffects`（粉色光点跟随 + 拖尾）、`ReadingProgress`（阅读进度条）、`MusicPlayer`（右下角悬浮音乐播放器，4 首歌单）。

### 写文章

- 分类 / 标签 / 专栏移到标题下方，标签改为 `datalist` 下拉建议，不用重复输入。
- 支持 **上传 .md 文件直接导入**正文。

### 用户系统

- 新增 `/settings` 个人设置页：上传头像、修改昵称与简介，保存后跳回个人主页。
- 导航栏改为**圆形头像 + 用户名**，并加"✍️ 写文章"快捷入口；下拉菜单补齐文章管理、评论审核、个人设置。
- 修复昵称/头像改完不同步：`/api/me` 改为每次从数据库读最新用户信息。

### 专栏审核流程

- `Column` 新增 `status` 字段（DRAFT → PENDING → PUBLISHED），配套迁移
  `20261031160000_add_column_status` 与 `status` 索引。
- 用户可在个人主页创建专栏（`CreateColumnButton`），仅自己可见；点"申请发布"转 PENDING（`SubmitColumnButton`）。
- 管理员后台 `/admin/columns` 可**通过 / 下架**；前台 `/column` 只展示已发布专栏。

### 动态与相册

- 动态与相册合并：`/moments` 同时展示 **📷 相册** + **💬 说说**两个板块，支持图片与视频。
- 导航栏去掉"相册"入口；`/album`、`/admin/albums` 自动跳转 `/moments`、`/admin/moments`；后台导航同步移除。

### 个人主页

- 文章分页（5 篇一页）+ 卡片底部"✏️ 编辑文章"入口，无需进后台。
- 展示自己的专栏及状态（草稿 / 待审核 / 已发布）。

### 保留的既有修复（未回退）

- `lib/search.ts` 维持**运行时 tsvector** 写法，不引用会被 `db push` 清掉的生成列。
- 默认头像继续走内联 data URI（`DEFAULT_AVATAR`），V2.5 里的 `/default-avatar.png` 引用已改回，避免 preload 告警。
- 数据库结构变更一律走 `prisma migrate deploy`，未使用 `db push`。

---

## [2.0.2] — 2026-10-31 · 搜索崩溃修复

### 修复

- **搜索页 500：`column p.searchVector does not exist`**
  数据库里的 `searchVector` 生成列连同 GIN 索引被清掉了。根因是搜索查询硬依赖这个生成列，
  而 Prisma schema 无法映射生成列——任何一次 `prisma db push` / `prisma migrate dev` 都会把它
  判定为"schema 里没有的多余对象"并删除，搜索随即崩溃。
  处理：`lib/search.ts` 不再引用生成列，改为**运行时 tsvector 表达式**（标题权重 A / 摘要 B / 正文 C），
  并给中文 ILIKE 命中加上排序权重（标题 +1.0、摘要 +0.3），让中英文结果都能按相关度排序。
  现在无论索引在不在，搜索都不会再崩。

### 新增

- `npm run db:search-index`（`scripts/ensure-search-index.mjs`）：幂等建立搜索加速索引
  （tsvector 表达式 GIN + title/content/excerpt 的 pg_trgm 索引）。属可选优化，
  被 `db push` 清掉后重跑即可，**不影响功能**。
- `npm run smoke`（`scripts/smoke-test.mjs`）：一次性体检脚本，覆盖数据层、13 个页面 HTTP 状态、
  文章页 SEO 要素、搜索高亮、登录与 11 个后台页面、3 个 API。本次全量跑通 **45 项全绿**。

### 运维提醒

- 改数据库结构请用 `npx prisma migrate deploy`，**不要用 `prisma db push`**——
  后者会把库对齐到 schema，清掉迁移 SQL 里手工创建的索引与生成列。
- PostgreSQL 便携版不是系统服务，重启电脑后需重新启动（`start.bat` 会自动处理）。
  本次观察到一次非正常关机后的自动崩溃恢复（WAL redo），数据无损失。

---

## [2.0.1] — 2026-10-30 · 细节修复

### 修复

- **默认头像触发 Chrome preload 告警**
  全站控制台刷 `The resource /default-avatar.svg was preloaded but not used` 提示。
  排查确认代码里无 `rel="preload"`、`next.config.ts` 未设 Link 响应头、manifest 图标为 data URI、SW 未预缓存 —— 属浏览器对页面内图片资源的自动 preload，而默认头像只在"用户未上传头像"时才渲染，多数页面加载后数秒内用不到。
  处理：把该 SVG 内联为 data URI，在 `lib/utils.ts` 导出 `DEFAULT_AVATAR`，替换 4 处引用（文章作者卡片、动态页、用户主页、评论头像），使其不再是独立网络请求。
  > 线上需硬刷新（Ctrl+Shift+R）或在 DevTools → Application → Service Workers 里 Unregister，旧 SW 才会退出。

- **Service Worker 缓存版本未失效**
  `public/sw.js` 静态缓存标识 `blog-v2-static-v1` → `v2`，确保旧缓存自动淘汰。

- **中文 slug 在生产运行时不可用**（2.0.0 构建期遗留）
  `/blog/中文标题` 未编码请求返回 500、URL 编码后返回 404。
  改为用 `pinyin-pro` 生成 ASCII 拼音 slug，并提供 `scripts/reslug.ts` 批量重建历史 slug。

- **全站退化为动态渲染**（2.0.0 构建期遗留）
  根 `layout.tsx` 里调用 `cookies()` 读登录态，导致所有页面无法静态化、文章页拿不到 SSG+ISR。
  改为登录态由客户端请求 `/api/me` 获取，首页与文章页恢复为 SSG + ISR 60s。

### 变更

- 文档补充"已知取舍"与 Windows 构建注意事项。

---

## [2.0.0] — 2026-10-30 · 全栈重写

从 V1（Flask 单体 + SQLite + 客户端渲染）整体重写为 Next.js 全栈架构。
V1 原始文件完整保留在 `legacy/`（含 `site.db`），可随时回滚或重跑迁移。

### 架构

| 层 | V1 | V2 |
|---|---|---|
| 框架 | Flask 单体 | Next.js 16.4（App Router）+ React 19 |
| 渲染 | 客户端 JS 拉 API 拼页面 | SSG + ISR / Server Component 直出 |
| 数据 | SQLite + 裸 `sqlite3` | PostgreSQL 17 + Prisma 6.19（13 张表） |
| 语言 | Python | TypeScript（strict） |
| 样式 | 原生 CSS | Tailwind CSS 4 + 自研设计变量 |
| 认证 | 自建 | 自建 JWT 会话（jose）+ GitHub OAuth |

### 新增能力

**内容创作**
- Markdown 编辑器：编辑 / 分屏 / 预览三模式，`Ctrl+S` 保存，Tab 缩进
- 代码高亮 + 一键复制、图片懒加载 + 点击放大
- 草稿 / 发布 / 归档 / 置顶 / 定时发布
- 版本历史：每次更新存快照，自动保留最近 10 版
- 图片上传（`/api/upload`，预留对象存储切换点）

**知识管理**
- 分类（含描述与排序）、标签（标签云按文章数调字号）
- 专栏：系列文章独立目录页 + 专栏订阅 feed
- 归档时间线（按年月分组，ISR 300s）
- 全文搜索：tsvector（英文/数字）+ pg_trgm / ILIKE（中文兜底），关键词高亮、分类过滤、分页
- RSS `/feed.xml`、Sitemap `/sitemap.xml`、robots、BlogPosting JSON-LD
- 文章目录（TOC）：服务端直出 + IntersectionObserver 滚动高亮

**社区互动**
- 多级嵌套评论（最多 3 层）、@提及高亮、审核开关、软删除
- 点赞 / 收藏（同用户去重、可逆）、阅读量原子递增
- 用户主页、关注 / 粉丝、我的收藏
- 管理后台 12 个页面：文章 CRUD 与批量操作、评论三态审核、分类 / 标签 / 专栏 / 动态 / 相册管理、站点设置

### 数据迁移

采用绞杀者模式，导出 → 映射 → 幂等导入（`npm run export:v1` → `npm run import:v1`）。
实际迁移结果：2 用户 / 7 文章 / 3 分类 / 4 动态 / 0 评论全部落地。

| V1 | V2 | 处理 |
|---|---|---|
| `users.pwd`（sha256） | `User.password` | 原样导入，首次登录成功后自动升级为 scrypt |
| `posts.cat` | `Category` | 自动建分类并关联 |
| `posts.date`（YYYY-MM-DD） | `publishedAt` | 按中午 12 点构造，避免时区漂移 |
| `posts.views` / `likes` | `viewCount` / `likeCount` | V1 库缺列时按 0 处理（脚本按 PRAGMA 动态取值） |
| `moments.media` | `Moment.media`（JSON） | 字符串按空格 / 逗号切分为数组 |
| `comments` | `Comment` | 仅迁移 `target_type='post'` 的部分 |

### 已知取舍

- 中文全文检索未引入 zhparser / pg_jieba（Windows 便携版装扩展成本高），改用 pg_trgm + ILIKE 兜底；数据量上万或需更准分词时建议换 Meilisearch，或在 Linux 上装 zhparser
- 定时发布采用懒惰调度：后台列表加载时把到期草稿自动发布，够用但不精确；量大可换 cron 打 `/api/cron/publish`
- 后台鉴权在 layout + 每个 Server Action 内双重校验（middleware 跑在 Edge Runtime，拿不到 Prisma，无法判角色）

---

## [1.3.2] — 2026-10-29

- 修复 GitHub OAuth 回调 500：获取用户信息的 req 被注释吞掉
- 修复 OAuth 回调地址写死 `127.0.0.1`，改为环境变量可配置
- 修复 `index.html` 直接调 GitHub API 导致 CORS，统一走后端代理

## [1.3.1] — 2026-10-29

- 修复 GitHub API 浏览器 CORS：新增后端通用代理 `/api/github-proxy?url=...`
- 修复 `/api/moments` 路由被注释吞掉导致 404
- 部署到腾讯云 Ubuntu 服务器
- 新增 `/api/github/repos`、`/api/github/readme/<repo>` 备用接口

## [1.3.0] — 2026-10-25

- PWA 支持（manifest + Service Worker + 离线回落）
- 博客文章改后端 SQLite 存储，发文章 / 删文章 / 编辑走 API
- 文章排序字段
- 首页热门文章评分

## [1.0.0] — 初始版本

- Flask + SQLite + 原生 HTML/JS 个人博客
- 邮箱登录、GitHub OAuth、动态、相册

# 博客 V2 · Next.js 全栈版

> **当前版本**：`2.5.3`（2026-10-31）
> **更新日志**：见 [CHANGELOG.md](./CHANGELOG.md)
> **启动方式**：见 [STARTUP.md](./STARTUP.md)（双击 `start.bat` 即可）

从 V1（Flask + SQLite + 原生 HTML）升级而来的全栈博客，对标 CSDN 级别的内容平台能力。

```
V1:  Flask 单体 + SQLite + 客户端渲染     → SEO 为零、无全文搜索、互动薄弱
V2:  Next.js 16 (App Router) + PostgreSQL + Prisma + SSR/SSG/ISR
```

## 版本速览

| 版本 | 日期 | 要点 |
|---|---|---|
| `2.5.3` | 2026-10-31 | 音乐播放器 UI 重做：横排四圆钮（白⏮ / 粉▶ / 白⏭ / 白☰）、SVG 图标；修复自动连播闭包 bug |
| `2.5.2` | 2026-10-31 | 全站站名统一为 characteristic·博客、站描述「在星空下持续写作」（含页头/页脚/RSS/SEO/PWA），账号昵称保持不变 |
| `2.5.1` | 2026-10-31 | 首页 Hero 文案改为 characteristic·博客 / 打字机「全栈·单片机·机器视觉」/ 副标题「在星空下持续写作」（与站名解耦） |
| `2.5.0` | 2026-10-31 | 粉色系视觉改版、整屏视频 Hero、音乐播放器、专栏审核流程（草稿→待审→发布）、个人设置页、动态相册合并 |
| `2.0.2` | 2026-10-31 | 修复搜索页 500（不再依赖生成列）、新增 `npm run smoke` 体检脚本与搜索索引脚本 |
| `2.0.1` | 2026-10-30 | 头像 preload 告警修复、SW 缓存升版、中文 slug 改拼音、全站恢复 SSG |
| `2.0.0` | 2026-10-30 | 全栈重写：SSR/SEO、全文搜索、多级互动、专栏体系、管理后台 |
| `1.3.2` | 2026-10-29 | GitHub OAuth 回调修复（V1 末版，代码留在 `legacy/`） |

## 一、技术选型

| 层 | 技术 | 说明 |
|---|---|---|
| 框架 | Next.js 16.4（App Router）+ React 19 | SSR/SSG/ISR 原生解决 SEO |
| 语言 | TypeScript（strict） | |
| ORM | Prisma 6.19 | schema 即文档，迁移可版本化 |
| 数据库 | PostgreSQL 17 | tsvector 全文索引 + pg_trgm 中文兜底 |
| 样式 | Tailwind CSS 4 + 自研设计变量 | 支持浅色/深色 |
| 编辑器 | Markdown（react-markdown + Shiki 级高亮） | 编辑/分屏/预览三模式 |
| 认证 | 自建 JWT 会话（jose）+ GitHub OAuth | 不依赖 next-auth beta |
| PWA | manifest + Service Worker | 离线回落页 |

## 二、能力对照

### 内容创作
- Markdown 编辑器：编辑 / 分屏 / 预览，`Ctrl+S` 保存，Tab 缩进
- 代码高亮 + 一键复制按钮、图片懒加载 + 点击放大
- 草稿 / 发布 / 归档 / 置顶 / **定时发布**
- **版本历史**：每次更新存快照，自动保留最近 10 版
- 图片上传（`/api/upload`，预留对象存储切换点）
- **上传 .md 文件直接导入**正文

### 知识管理
- 分类（含描述与排序）、标签（标签云按文章数调整字号）
- **专栏**：系列文章独立目录页 + 专栏订阅 feed
- **专栏审核**：用户创建（草稿）→ 申请发布（待审核）→ 管理员通过/下架，前台只展示已发布
- 归档时间线（按年月分组）
- **全文搜索**：tsvector(英文/数字) + ILIKE/pg_trgm(中文)，关键词高亮、分类/标签过滤、分页
- RSS（`/feed.xml`）、Sitemap（`/sitemap.xml`）、robots、BlogPosting JSON-LD

### 社区互动
- 多级嵌套评论（最多 3 层）、@提及高亮、**审核开关**、软删除
- 点赞 / 收藏（同一用户去重、可逆）、阅读量原子递增
- 用户主页（文章分页 + 就地编辑 + 我的专栏状态）、关注 / 粉丝
- **个人设置页** `/settings`：上传头像、改昵称与简介
- **动态板块**：文字 + 多图 + 视频，与相册合并为 📷 相册 / 💬 说说 两栏
- 管理员后台：文章批量操作、评论三态审核、分类标签专栏管理、动态管理、专栏审核

## 三、目录结构

```
app/
  page.tsx                    首页（ISR 60s）
  blog/page.tsx               文章列表（最新/最热 + 分页）
  blog/[slug]/page.tsx        文章详情（SSG + ISR、JSON-LD、目录、上下篇、相关）
  category/[slug]/tag/[slug]/ 分类页 / 标签页
  archive/                    归档时间线
  column/、column/[slug]/     专栏列表与目录
  moments/、album/            动态（含相册板块）、相册（已合并，跳转 moments）
  search/                     全文搜索（Server Component + URL 驱动）
  u/[id]/、bookmarks/         用户主页、我的收藏
  settings/                   个人设置（头像、昵称、简介）
  login/                      登录注册
  admin/                      管理后台（layout 级鉴权）
  feed.xml/、sitemap.ts、robots.ts
  api/                        auth、views、upload、columns、user/profile
components/                   UI 组件
lib/                          db / auth / search / actions / admin / toc / utils
prisma/schema.prisma          数据模型
prisma/migrations/            版本化迁移（只用 migrate deploy，禁用 db push）
public/videos|music|uploads/  视频背景、音乐播放器歌单、上传文件
scripts/                      export-sqlite.py、import-from-sqlite.ts
legacy/                       V1 原始文件（迁移源 + 回滚备份）
```

> **媒体资源**：`public/videos`（约 42MB，其中 bg3.mp4 占 40MB）与 `public/music`（约 45MB）
> 不随源码包分发（打包默认排除，见 `npm run pack`）。缺失时视频背景与音乐播放器会静默失效，
> 页面本身不受影响。建议后续压缩 bg3.mp4 或改走 CDN。

## 四、从 V1 迁移（绞杀者模式）

数据不是推翻重来，而是导出 → 映射 → 幂等导入：

```bash
# 1. 导出 V1 SQLite 为 JSON
npm run export:v1          # -> data/v1-export.json

# 2. 建表（含全文索引与默认配置）
npx prisma migrate deploy

# 3. 幂等导入（重复执行不会产生脏数据）
npm run import:v1          # 支持 --dry-run 预演
```

字段映射与容错：

| V1 | V2 | 处理 |
|---|---|---|
| `users.pwd`(sha256) | `User.password` | 原样导入，首次登录成功后自动升级为 scrypt |
| `posts.cat` | `Category` | 自动建分类并关联 |
| `posts.date`(YYYY-MM-DD) | `publishedAt` | 按中午 12 点构造，避免时区漂移 |
| `posts.views/likes` | `viewCount/likeCount` | V1 库若缺列则按 0 处理（脚本按 PRAGMA 动态取值） |
| `moments.media` | `Moment.media`(JSON) | 字符串按空格/逗号切分为数组 |
| `comments` | `Comment` | 仅迁移 `target_type='post'` 的部分 |

迁移后用 `legacyId` 字段保留溯源，随时可重跑导入而不重复。

**并行运行建议**：把 V1 Flask 与 V2 Next.js 同时跑，用 Nginx 按路径分流——`/api/*` 先继续打到 Flask，页面路由走 Next.js，逐个页面验证后再切换写操作，最后停掉 Flask。

## 五、本地启动

> **不想记命令就双击 `start.bat`**（开发改代码双击 `dev.bat`，停止双击 `stop.bat`）。
> 它会自动拉起数据库、按需构建、启动并打开浏览器。详见 [STARTUP.md](./STARTUP.md)。

手工步骤如下：

```bash
# 1) 数据库（已在本机装好 PostgreSQL 17 便携版）
#    启动：C:\Users\18886\postgres\bin\pg_ctl.exe -D C:\Users\18886\pgdata -l C:\Users\18886\pgdata\server.log start
#    停止：把 start 换成 stop

# 2) 依赖
npm install

# 3) 环境变量
cp .env.example .env    # 至少修改 SESSION_SECRET 与 GITHUB_CALLBACK

# 4) 建表 + 导数据
npx prisma migrate deploy
npm run export:v1 && npm run import:v1

# 5) 开发 / 生产
npm run dev             # http://localhost:3000
npm run build && npm start
```

> ⚠️ **Windows 上必须用 `npx next build --webpack`**。
> Next.js 16 默认启用 Turbopack，在本机（Windows + Node 22）会在编译阶段无输出卡死 10 分钟以上；
> 加 `--webpack` 后约 2 分钟完成。Linux/macOS 可不加。

首次进入后台需要管理员账号：数据库里第一个用户即为 ADMIN（V1 导入时 `legacyId` 最小的用户会被设为管理员），也可直接注册——**第一个注册用户自动成为 ADMIN**。

## 六、环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL 连接串 |
| `SESSION_SECRET` | ✅ | 会话签名密钥，生产务必更换（≥32 位） |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 站点地址，决定 canonical / sitemap / RSS 的 URL |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth | GitHub 应用凭证 |
| `GITHUB_CALLBACK` | OAuth | **回调地址必须走环境变量**，本地与生产分开配置 |
| `SITE_NAME` / `SITE_DESCRIPTION` / `AUTHOR_NAME` | 可选 | 站点元信息 |

## 七、部署

- **Vercel**：连接仓库后填写环境变量即可，`prisma migrate deploy` 建议放进 Build Command
- **自托管**：`npm run build` + `npm start`，外层套 Nginx 反代并开启 gzip；`public/uploads` 需持久化
- **图片存储**：当前写本地磁盘。上云时把 `app/api/upload/route.ts` 里的 `writeFile` 换成 OSS/S3/Supabase Storage 的 SDK 调用即可，前端不用改

## 八、已知取舍

- 搜索查询**不使用生成列**，而是运行时计算 tsvector。原因是 Prisma schema 无法映射生成列，
  `prisma db push` / `migrate dev` 会把它当多余对象删除并导致搜索 500（已在 2.0.2 修复）。
  需要索引加速时执行 `npm run db:search-index`（幂等，随时可重跑）
- ⚠️ **改数据库结构一律用 `npx prisma migrate deploy`，不要用 `prisma db push`**——
  `db push` 会把库对齐到 schema，清掉迁移 SQL 里手工创建的索引等对象
- 中文全文检索没有引入 zhparser/pg_jieba（Windows 便携版装扩展成本高），改用 pg_trgm + ILIKE 兜底；数据量上万或需更准的分词时，建议换 Meilisearch 或在 Linux 上装 zhparser
- 定时发布采用「懒惰调度」：后台列表加载时把到期草稿自动发布，够用但不精确；量大可换成 cron 打 `/api/cron/publish`
- 评论默认不审核，`/admin/settings` 可一键开启
- 后台鉴权在 layout + 每个 Server Action 内双重校验（middleware 跑在 Edge Runtime，拿不到 Prisma，无法判角色）

## 九、打包与发版

发版前按顺序做这四件事：

```bash
# 1) 更新版本号
#    package.json  -> "version": "2.0.1"

# 2) 补日志
#    CHANGELOG.md  -> 新增版本段，写明 Added / Changed / Fixed
#    README.md     -> 顶部「版本速览」表格加一行

# 3) 校验
npx tsc --noEmit
npx next build --webpack        # Windows 必加 --webpack

# 3.5) 冒烟测试（需先启动站点）
npm start &                     # 或双击 start.bat
npm run smoke                   # 45 项体检：页面/SEO/搜索/登录/后台/API

# 4) 打源码包（排除依赖与构建产物）
npm run pack                    # -> ../dist/my_blog_V2.0.1_src_<日期>.zip
```

`npm run pack` 由 `scripts/pack.py` 执行，打包范围与排除项：

| 包含 | 排除 |
|---|---|
| `app/` `components/` `lib/` `prisma/` `public/` `scripts/` | `node_modules/` `.next/` `.git/` |
| `package.json` `package-lock.json` 配置文件 | `.env`（含密钥，改用 `.env.example`） |
| `README.md` `CHANGELOG.md` `.gitignore` | `data/` `public/uploads/` `*.log` |
| `legacy/`（V1 原件 + `site.db`，保留回滚能力） | `tsconfig.tsbuildinfo` |

> 包内**不含** `node_modules`，拿到新机器执行 `npm install` 即可还原
> （`postinstall` 会自动跑 `prisma generate`）。

**打 Git 标签**（可选，便于回溯）：

```bash
git add -A
git commit -m "chore: release v2.0.1"
git tag -a v2.0.1 -m "v2.0.1 头像 preload 修复、中文 slug 改拼音"
```

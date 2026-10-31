# 更新日志

本项目所有显著变更记录在此文件。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

---

## [2.5] — 2026-10-31 · 功能大版本

### ✨ 新增功能

- **音乐播放器**
  - 右下角固定粉色风格音乐播放器
  - 支持播放/暂停、上一首/下一首、歌单列表、进度条
  - 本地音乐文件存放于 `public/music/` 目录
  - V1 Flask 版同步添加

- **个人设置页** `/settings`
  - 上传头像（手机/电脑均可选择）
  - 修改昵称、个人简介
  - 保存后强制刷新，导航栏头像昵称同步更新

- **专栏审核流程**
  - 三级状态：DRAFT 草稿 → PENDING 待审核 → PUBLISHED 已发布
  - 用户可在自己主页创建专栏，申请发布
  - 管理员后台审核通过/下架
  - 前台公开专栏页只显示已发布的

- **文章编辑器优化**
  - 支持上传 .md 文件导入内容
  - 标签改为 datalist 下拉选择，不用点选按钮
  - 分类/标签/专栏移到标题下方突出显示

- **个人主页优化**
  - 文章分页（5篇一页）
  - 文章卡片底部加"编辑文章"按钮，直接跳转编辑
  - 显示用户自己的专栏板块

- **动态与相册合并**
  - 合并为单一"动态"板块
  - 支持发文字、图片、视频
  - 导航栏去掉"相册"入口

### 🎨 UI 优化

- 整体粉色系美化：更大圆角、更柔和阴影
- 导航栏改成圆形头像 + 用户名样式
- 鼠标跟随粉色光点特效
- 去掉背景流动光斑

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

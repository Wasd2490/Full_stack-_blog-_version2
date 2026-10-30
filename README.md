# 🌸 个人博客 V2.5 · Next.js 全栈版

> **当前版本**：`2.5`（2026-10-30）
> 粉色系动漫风格 UI，整屏视频背景首屏

从 V1（Flask + SQLite）升级而来的全栈博客平台。

```
V1:  Flask 单体 + SQLite + 客户端渲染
V2:  Next.js 16 (App Router) + PostgreSQL + Prisma + SSR/SSG/ISR
```

## 版本速览

| 版本 | 日期 | 要点 |
|---|---|---|
| `2.5` | 2026-10-30 | UI 全面美化、个人设置页、专栏审核流程、动态相册合并、标签下拉、MD上传、导航栏圆形头像 |
| `2.0.1` | 2026-10-30 | 头像 preload 告警修复、中文 slug 改拼音、全站恢复 SSG |
| `2.0.0` | 2026-10-30 | 全栈重写：SSR/SEO、全文搜索、多级互动、专栏体系、管理后台 |

## 一、技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16.4.3 + React 19 |
| 语言 | TypeScript |
| ORM | Prisma 6.19.3 |
| 数据库 | PostgreSQL |
| 样式 | Tailwind CSS 4 + 粉色系设计变量 |
| 编辑器 | Markdown（react-markdown + Shiki） |
| 认证 | 自建 JWT + GitHub OAuth |

## 二、功能特性

### ✍️ 内容创作
- Markdown 编辑器，支持上传 .md 文件导入
- 分类、标签（下拉选择）、专栏三级分类
- 草稿/发布状态管理
- 文章封面图

### 👥 用户系统
- GitHub OAuth 登录
- 个人主页（头像、昵称、简介）
- 个人设置页（上传头像、修改昵称/简介）
- 个人主页文章分页（5篇/页）
- 个人主页直接编辑自己的文章
- 导航栏圆形头像 + 用户名

### 📚 专栏系统
- 用户可创建专栏（默认草稿）
- 申请发布 → 管理员审核 → 公开发布
- 个人主页显示专栏状态（草稿/待审核/已发布）
- 管理员后台审核/下架专栏

### 💬 动态板块
- 文字说说
- 多图上传
- 视频上传
- 相册 + 说说合并展示

### 🎨 视觉效果
- 整屏视频轮播首屏
- 全局视频背景
- 粉色光点鼠标跟随特效
- 毛玻璃导航栏
- 卡片悬停 3D 效果

## 三、本地启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入数据库、GitHub OAuth 等

# 3. 初始化数据库
npx prisma db push
npx prisma generate

# 4. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

> ⚠️ **Windows 构建必须用**：`npx next build --webpack`（Turbopack 会卡死）

## 四、环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `SESSION_SECRET` | 会话签名密钥（≥32位） |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret |
| `SITE_NAME` | 站点名称 |
| `NEXT_PUBLIC_SITE_URL` | 站点完整 URL |

## 五、部署到腾讯云

### 1. 服务器准备（Ubuntu）

```bash
# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo apt-get install -y nginx
```

### 2. 配置数据库

```bash
sudo -u postgres psql
```

```sql
CREATE USER blog WITH PASSWORD '你的密码';
CREATE DATABASE blog_v2 OWNER blog;
GRANT ALL PRIVILEGES ON DATABASE blog_v2 TO blog;
\q
```

### 3. 上传源码

```bash
# 解压
unzip my_blog_V2.5_src.zip
cd my_blog_V2.0.1_src_20261030

# 安装依赖
npm install
```

### 4. 配置环境变量

创建 `.env` 文件：

```env
DATABASE_URL="postgresql://blog:你的密码@localhost:5432/blog_v2?schema=public"
GITHUB_CLIENT_ID="你的GitHub Client ID"
GITHUB_CLIENT_SECRET="你的GitHub Client Secret"
SESSION_SECRET="随机32位以上字符串"
SITE_NAME="你的博客名"
NEXT_PUBLIC_SITE_URL="http://你的服务器IP:3000"
```

### 5. 初始化数据库

```bash
npx prisma db push
npx prisma generate
```

### 6. 构建项目

```bash
npm run build
```

### 7. 启动服务

```bash
# PM2 启动
pm2 start npm --name "blog" -- start

# 开机自启
pm2 save
pm2 startup
```

### 8. 配置 Nginx

```bash
sudo nano /etc/nginx/sites-available/blog
```

写入：

```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用：

```bash
sudo ln -s /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. GitHub OAuth 配置

在 GitHub Developer Settings 里，回调地址填：
`http://你的域名/api/auth/callback/github`

## 六、更新日志

### V2.5 (2026-10-30)

**🎨 视觉优化**
- 整体 UI 美化：更大圆角、更柔和粉色阴影
- 导航栏毛玻璃效果增强
- 按钮悬停上浮效果
- 鼠标特效改成粉色光点跟随 + 拖尾
- 去掉背景流动光斑

**✍️ 写文章**
- 分类/标签/专栏移到标题下方
- 标签改成下拉选择（datalist）
- 支持上传 .md 文件导入内容
- 已有标签下拉建议

**👤 用户系统**
- 新增个人设置页 `/settings`
- 支持上传头像、修改昵称、个人简介
- 导航栏改成圆形头像 + 用户名
- 修复昵称修改后不同步问题

**📚 专栏系统**
- 完整审核流程：草稿 → 申请 → 管理员审核 → 发布
- 用户可在自己主页创建专栏
- 管理员后台审核/下架专栏
- 前台只显示已发布的专栏

**💬 动态与相册**
- 动态和相册合并成一个板块
- 动态支持发文字、图片、视频
- 导航栏去掉"相册"入口

**📄 文章管理**
- 个人主页文章分页（5篇一页）
- 个人主页文章卡片加"编辑文章"按钮

### V2.0.1 (2026-10-30)
- 修复头像 preload 告警
- 中文 slug 改拼音
- 全站恢复 SSG

### V2.0.0 (2026-10-30)
- 全栈重写：Next.js 16 + Prisma + PostgreSQL
- SSR/SEO 优化
- 全文搜索
- 多级评论、点赞、收藏
- 专栏体系
- 管理后台

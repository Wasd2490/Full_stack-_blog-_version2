# 谁暖了冬季 · 个人博客站 V1.3

**线上地址：** http://106.52.34.17（腾讯云轻量服务器）

## V1.3.2 更新（2026-10-31）

- 新增**音乐播放器**：右下角固定粉色风格播放器
  - 支持播放/暂停、上一首/下一首、歌单列表、进度条
  - 本地音乐文件存放于 assets/music/ 目录
  - 内置 4 首歌：无间渡、你要的全拿走、忘不掉的你、把回忆拼好给你
- 全站 5 个页面统一添加音乐播放器

## V1.3.1 修复（2026-10-29）

- 修复 GitHub API 浏览器 CORS 问题：新增后端通用代理 /api/github-proxy?url=...
- 修复 /api/moments 路由被注释吞掉导致 404
- 部署到腾讯云 Ubuntu 服务器
- 新增 /api/github/repos 和 /api/github/readme/<repo> 备用接口

## V1.3 更新（2026-10-25）

- 博客文章改后端 SQLite 存储，发文章/删文章/编辑都走 API
- 博客文章编辑功能：点编辑按钮加载原文，改完保存
- 博客文章排序：右下角 ⇅ 按钮弹窗调整顺序，数据库持久化
- CSDN 文章视频自动转 iframe 播放器
- CSDN 图片防盗链处理（referrerpolicy=no-referrer）
- PWA 支持：manifest.json + service worker，手机可添加到主屏幕
- 首页文章从后端加载，不再读 localStorage
- 启动 app.py 自动拉起 ngrok 公网穿透
## V1.2 更新（2026-10-21）

- 空间动态改后端 SQLite 存储，刷新不丢
- 空间动态 4 条/页分页 + 删除按钮
- 空间新增相册 tab，网格浏览所有照片，点击放大
- 修复嵌套模板字符串导致的 JS 语法错误
- 修复图片/视频类型判断错误
- 后端 body 限制提到 20MB
- 修复 blog.html Hero 轮播空元素导致的 JS 报错
- footer 改为「characteristic · 博客 / 仅供学习·著作权归@谁暖了冬季所有」
- Hero 大标题黑色，右侧个人卡名字统一为「谁暖了冬季」
- 所有页面 title 和导航栏 brand 统一为「characteristic · 博客」

## V1.1 更新（2026-10-21）

- 全文正文文字改为黑色，仅保留手写体标题和按钮粉色
- 首页项目板块自动拉取 GitHub API
- 4 张文章预览图本地化到 assets/（解决 CSDN 防盗链）
- 项目详情页 404 时显示返回列表按钮

## V1.0 更新（2026-10-21）

- Hero 全屏动态背景 4 张轮播
- CSDN 两栏博客布局，粉色系配色
- 博客写文章功能：支持 .md 文件上传 + Markdown 粘贴
- GitHub API 同步仓库列表 + 文件树 + README 展示
- 空间分享：发文字+图片/视频
- Flask 后端 + SQLite 数据库
- 邮箱注册/登录 + GitHub OAuth
- ngrok 外网穿透

## 功能总览

| 页面 | 文件 | 功能 |
|---|---|---|
| 首页 | index.html | Hero 动态背景轮播 + 两栏布局 + 个人卡/分类/归档 |
| 博客 | blog.html | MD 上传/粘贴 + 4篇分页 + 编辑/排序/删除 + 评论 |
| 项目 | projects.html | GitHub API 同步 + 文件树 + README 预览 |
| 记录 | personal.html | 技能栈 + 成长时间线 |
| 空间 | space.html | 朋友圈风格动态 + 相册 tab |

## 本地运行

```bash
pip install flask flask-cors
python app.py
```

浏览器打开 http://127.0.0.1:5000

启动后自动拉起 ngrok，控制台会打印公网地址。

## 技术栈

- 原生 HTML / CSS / JavaScript（无构建）
- Flask + SQLite 后端
- marked.js（Markdown 渲染）
- GitHub REST API
- PWA（manifest + service worker）

## 目录结构

```
my_blog_V1.3/
├── index.html        # 首页
├── blog.html         # 博客
├── projects.html     # GitHub 项目
├── personal.html     # 记录
├── space.html        # 空间分享
├── app.py            # Flask 后端
├── site.db           # SQLite 数据库
├── manifest.json      # PWA 配置
├── sw.js             # Service Worker
├── assets/           # 图片/视频素材
└── README.md
```

## 联系

- GitHub: https://github.com/Wasd2490
- CSDN: https://blog.csdn.net/wjcjjsjs
- 邮箱: 3287316014@qq.com

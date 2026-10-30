# Flask个人博客 V1.3 全栈搭建记录｜原生前端+Flask+SQLite，从本地部署到PythonAnywhere上线

**项目地址：** [谁暖了冬季 · 个人博客站 V1.3](https://github.com/Wasd2490/my_blog_V1.3)

**线上体验：** https://xue12.pythonanywhere.com

> 版本：V1.3 | 作者：谁暖了冬季 | 类型：自研轻量个人站点，无前端框架、零MySQL依赖
>
> 环境清单（可复现）
> - Python：3.12
> - Flask：3.x
> - 前端：原生HTML/CSS/JS + marked.js
> - 数据库：SQLite3（Python内置）
> - 外网穿透：ngrok（本地开发）/ PythonAnywhere（生产部署）
> - PWA：manifest.json + Service Worker

---

## 项目展示

![首页 Hero](https://i-blog.csdnimg.cn/direct/b59dad6c72c946868f9ce4cc8f9cfb5c.png)

![博客列表](https://i-blog.csdnimg.cn/direct/51bc355e0fc04728958daa19a68667b1.png)

![项目页](https://i-blog.csdnimg.cn/direct/7c0ebb7c9d4a4935a2355e44f90b2c0f.png)

![记录页](https://i-blog.csdnimg.cn/direct/8619fea3cde141f2b1f50b835dfeefa7.png)

---

## 一、项目背景 & 开发初衷

我是一名全栈开发者，同时爱好硬件开发，日常开发Java智慧校园系统、ESP32-LVGL界面、树莓派ROS2小车，长期在CSDN沉淀技术笔记。

长期使用CSDN写作有几个无法回避的痛点：

1. 平台约束强，广告较多，页面排版固定，不方便集中展示自研Github项目
2. 想要一个完全自主可控的空间：发布技术文章、项目展示、动态相册、评论交互
3. 不想使用Hexo/Hugo：依赖Node环境，构建流程繁琐
4. 不想使用WordPress：后台臃肿、冗余功能多，学习和维护成本高

因此决定自研：**原生手写前端 + Flask轻量后端 + SQLite单文件数据库**，不引入重型框架，一个页面一个HTML文件，结构干净、方便二次迭代。

> 核心定位：轻量自建博客，面向自己的项目展示与技术笔记，支持公网访问。

---

## 二、技术选型

| 层 | 选型 | 选型理由 |
|---|---|---|
| 前端 | 原生 HTML + CSS + JavaScript | 无打包框架，加载速度快，自由度高，风格对标CSDN两栏布局 |
| Markdown渲染 | marked.js | 在浏览器前端直接完成MD转HTML，减轻后端压力 |
| 后端 | Flask | Python轻量web框架，开发速度快，适合小型个人站点 |
| 数据库 | SQLite | Python内置、零配置、单文件存储，无需单独部署MySQL服务 |
| 登录认证 | 邮箱注册 + GitHub OAuth | 个人开发者无法申请微信登录，CSDN无开放登录接口 |
| 公网访问 | PythonAnywhere + ngrok | PythonAnywhere免费永久在线，ngrok本地开发临时穿透 |
| PWA | manifest.json + sw.js | 手机可添加到主屏幕，离线缓存资源 |
| 视觉素材 | 樱花/银河/风铃mp4视频 + 银发精灵静态图 | Hero全屏动态轮播背景 |
| 主题配色 | 粉色系 `#ff6b9d` | 视觉柔和，和我CSDN博客的风格统一 |

---

## 三、页面结构

```
my_blog_V1.3/
├── index.html        # 首页（两栏布局、Hero轮播、模块预览）
├── blog.html         # 博客：文章列表、MD编辑器、文章详情、评论、排序弹窗
├── projects.html     # 项目页：同步拉取GitHub仓库、README渲染、文件树
├── personal.html     # 个人记录页：技能栈、开发时间线
├── space.html        # 空间动态页：朋友圈动态 + 相册网格
├── app.py            # Flask后端主程序
├── site.db           # SQLite数据库文件
├── manifest.json     # PWA配置
├── sw.js             # Service Worker
├── assets/           # 图片、视频、头像等静态素材
└── README.md         # 项目文档
```

**项目启动入口 `app.py`（基础骨架）：**

```python
from flask import Flask, request, jsonify, send_from_directory, session
import sqlite3, os, secrets

BASE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=BASE, static_url_path='')
app.secret_key = secrets.token_hex(16)
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # 20MB

DB = os.path.join(BASE, 'site.db')

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

if __name__ == '__main__':
    # 启动自动拉起 ngrok
    import subprocess
    subprocess.Popen(['ngrok', 'http', '5000'])
    app.run(host='0.0.0.0', port=5000, debug=False)
```

> ⚠️ 重要提醒：debug=True 仅本地开发使用，生产环境必须关闭。

---

## 四、V1.3 核心新增功能

### 4.1 博客文章编辑功能

像CSDN一样，发布过的文章可以直接编辑修改：

```javascript
// 点击编辑按钮，加载原文到编辑器
async function editPost(id) {
  const res = await fetch(`/api/posts/${id}`);
  const post = await res.json();
  document.getElementById('md-editor').value = post.content;
  document.getElementById('post-title').value = post.title;
  document.getElementById('post-cat').value = post.category;
  document.getElementById('save-btn').onclick = () => updatePost(id);
}

// 保存修改
async function updatePost(id) {
  await fetch(`/api/posts/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({
      title: document.getElementById('post-title').value,
      category: document.getElementById('post-cat').value,
      content: document.getElementById('md-editor').value
    })
  });
  loadPosts();
}
```

### 4.2 文章排序（⇅ 弹窗调节）

右下角悬浮排序按钮，点击弹出文章列表，点上下箭头调整顺序，数据库持久化：

```javascript
async function openSortModal() {
  const res = await fetch('/api/posts');
  const posts = await res.json();
  const listEl = document.getElementById('sort-list');
  listEl.innerHTML = posts.data.map((p, i) => `
    <div class="sort-item" data-id="${p.id}">
      <span class="idx">${i+1}</span>
      <span class="title">${p.title}</span>
      <button onclick="moveSort(${p.id}, -1)">↑</button>
      <button onclick="moveSort(${p.id}, 1)">↓</button>
    </div>
  `).join('');
  document.getElementById('sort-modal').style.display = 'flex';
}

async function saveSort(orderedIds) {
  await fetch('/api/posts/sort', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({ids: orderedIds})
  });
}
```

数据库加了 `sort` 字段，查询时按 sort 排序：

```sql
SELECT * FROM posts ORDER BY sort ASC, created_at DESC
```

### 4.3 CSDN 视频自动转 iframe 播放器

从CSDN复制的MD文章里带的视频标签，自动转成可播放的iframe：

```javascript
function convertCsdnVideo(html) {
  const regex = /\[video\([^)]*url-(https:\/\/live\.csdn\.net\/v\/embed\/\d+)\)[^\]]*\]/g;
  return html.replace(regex, (match, url) =>
    `<iframe src="${url}" width="100%" height="400" frameborder="0" allowfullscreen></iframe>`
  );
}
```

### 4.4 CSDN 图片防盗链处理

CSDN图片直接引用会403，加 `referrerpolicy="no-referrer"` 解决：

```html
<img src="https://i-blog.csdnimg.cn/direct/xxx.png" referrerpolicy="no-referrer">
```

### 4.5 PWA 支持

手机可以添加到主屏幕，像APP一样打开：

```json
{
  "name": "谁暖了冬季 · 博客",
  "short_name": "博客",
  "start_url": "/index.html",
  "display": "standalone",
  "background_color": "#fdf7f9",
  "theme_color": "#ff6b9d",
  "icons": [
    {"src": "/assets/avatar.png", "sizes": "192x192", "type": "image/png"}
  ]
}
```

```javascript
self.addEventListener('install', e => {
  e.waitUntil(caches.open('v1.3').then(c =>
    c.addAll(['/', '/index.html', '/blog.html', '/assets/avatar.png'])
  ));
});
```

### 4.6 启动自动 ngrok 公网穿透

运行 `python app.py` 自动拉起ngrok：

```python
import subprocess, time
ngrok_process = subprocess.Popen(['ngrok', 'http', '5000'])
time.sleep(2)
import urllib.request
res = urllib.request.urlopen('http://127.0.0.1:4040/api/tunnels')
print('公网地址:', json.loads(res.read())['tunnels'][0]['public_url'])
```

---

## 五、核心功能详解

### 5.1 首页

首页采用CSDN风格两栏布局：

**左栏：**
- 顶部Hero全屏动态背景，4个素材轮播（樱花视频 / 银河视频 / 风铃视频 / 银发精灵图），页面向下滚动时Banner自动收缩
- 4个导航卡片入口：博客 / 项目 / 记录 / 空间
- 预览板块：精选博客文章、GitHub最新项目
- 底部联系区域：GitHub、CSDN、邮箱

**右栏：**
- 个人信息卡片：圆形头像、昵称、个人格言
- 文章分类统计、归档统计
- 右下角设置按钮：自定义首页展示的文章、展示仓库

![首页设置](https://i-blog.csdnimg.cn/direct/baa34629bb0b478a9ebe6d1a9b5257be.png)

![首页效果](https://i-blog.csdnimg.cn/direct/12f8091885a847af8d00315b75d7e311.png)

### 5.2 博客模块

博客页面核心能力：
- 右上角「✎ 写文章」弹窗编辑器
- 支持粘贴Markdown文本、上传md文件，marked.js实时预览
- 自定义分类、填写标题，数据写入后端SQLite持久化
- 分页列表，每页4篇文章
- 文章编辑、排序、删除
- Hash路由跳转到文章详情页，完整渲染表格、代码块、图片、CSDN视频
- 登录用户可在文章底部发布评论

![博客列表](https://i-blog.csdnimg.cn/direct/9dde00d382ca4ae1bf31c04fe85d07f7.png)

![写文章](https://i-blog.csdnimg.cn/direct/4dd7ca80b0d84b0cab72c24f32b0a262.png)

![文章详情](https://i-blog.csdnimg.cn/direct/13ed0027d2bb4b3ca3cba7db90df837d.png)

### 5.3 项目模块

项目页对接Github开放API：
- 自动拉取本人仓库列表，按更新时间排序
- 卡片展示仓库名称、简介、star、fork数量
- Hash路由进入仓库详情：左侧文件树、中间README渲染、右侧仓库元信息
- localStorage缓存10分钟，避免API限流

![项目列表](https://i-blog.csdnimg.cn/direct/1b6a0be107f64191b9433bfbdc1aed3b.png)

![项目详情](https://i-blog.csdnimg.cn/direct/c7efd52de70a420191607352fd525d52.png)

![文件树](https://i-blog.csdnimg.cn/direct/46946a381708418ba1844ed07d6c2faf.png)

### 5.4 个人记录页

记录页用来展示技能栈和开发成长时间线：

![记录页](https://i-blog.csdnimg.cn/direct/785cda58b5f84b178fea624a879e20d3.png)

![时间线](https://i-blog.csdnimg.cn/direct/c80dde55b72846fb9cf0cccff61d34a2.png)

### 5.5 空间动态页

朋友圈风格动态模块：
- 发布文字、图片、短视频动态
- 分页展示，每页4条
- Tab切换：动态流 / 相册
- 相册自动收集所有图片，三列网格布局，点击放大预览
- 数据持久化存入SQLite

![空间动态](https://i-blog.csdnimg.cn/direct/05f72f82039d4303a9912557761461e2.png)

---

## 六、后端API与数据库设计

### 接口汇总

| 接口 | 方法 | 说明 |
|---|---|---|
| /api/register | POST | 邮箱注册 |
| /api/login | POST | 邮箱登录 |
| /api/logout | POST | 退出登录 |
| /api/me | GET | 获取当前登录用户信息 |
| /auth/github | GET | GitHub OAuth跳转授权 |
| /auth/github/callback | GET | GitHub OAuth回调 |
| /api/posts | GET/POST | 获取文章列表 / 新增文章 |
| /api/posts/\<id\> | GET/PUT/DELETE | 获取单篇 / 编辑 / 删除文章 |
| /api/posts/sort | POST | 保存文章排序 |
| /api/moments | GET/POST | 获取动态列表 / 发布动态 |
| /api/moments/\<id\> | DELETE | 删除动态 |
| /api/comments/\<type\>/\<id\> | GET/POST | 获取评论 / 新增评论 |

### 建表SQL

```sql
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  nick TEXT NOT NULL,
  pwd TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT,
  content TEXT,
  sort INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS moments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT,
  media TEXT,
  type TEXT DEFAULT 'text',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 七、部署到 PythonAnywhere（免费上线）

V1.3 最终部署到了 PythonAnywhere 免费版，永久在线：

### 7.1 部署步骤

1. 注册 PythonAnywhere 账号（免费版即可）
2. 打开 Bash 控制台，clone 代码：
```bash
git clone https://github.com/Wasd2490/my_blog_V1.3.git
```
3. 创建 Web App，选 Flask 框架
4. 配置 WSGI 文件：
```python
import sys
path = '/home/xue12/my_blog_V1.3'
if path not in sys.path:
    sys.path.insert(0, path)
from app import app as application
```
5. Reload 网页，完成

### 7.2 踩坑记录

- **flask_cors 装不上**：PythonAnywhere Python 3.10 环境找不到 flask_cors，直接删掉这个依赖解决（同源部署不需要CORS）
- **中文乱码导致 SyntaxError**：app.py 里三处中文字符串乱码，全部改成正常中文后跑通
- **免费版每月要续期**：每月登录点一下「Run until 1 month from today」就行

---

## 八、开发踩坑记录

### 8.1 CSDN图片防盗链 403

**现象：** 在自己网站直接引用CSDN图片链接，图片全部加载失败，控制台403 Forbidden。

**解决：** 加 `referrerpolicy="no-referrer"`，或者下载到本地 assets 目录。

### 8.2 localStorage 存视频触发 QuotaExceededError

**现象：** 上传视频转base64存入localStorage，大视频写入失败，刷新后动态丢失。

**解决：** 核心数据持久化交给后端SQLite，localStorage仅做离线缓存。

### 8.3 JS 嵌套反引号模板字符串语法报错

**现象：** 使用嵌套 `${a ? `<img>` : `<video>`}` 写法，浏览器JS解析报错，页面直接无交互。

**解决：** 取消嵌套反引号，改用普通字符串拼接。

### 8.4 GitHub API 限流 403

**现象：** 短时间多次刷新项目页，仓库列表加载失败，返回403 rate limit。

**解决：** 增加localStorage缓存，10分钟内复用缓存数据。

### 8.5 Hero轮播JS在无Hero的页面报错

**现象：** blog.html、projects.html页面没有hero-layer元素，轮播代码执行时layers[i]为undefined。

**解决：** 获取dom后增加空值判断 `if (!layers[i]) return;`。

### 8.6 PythonAnywhere 部署乱码

**现象：** clone下来的app.py中文乱码，直接SyntaxError。

**解决：** 在本地修复后重新push到GitHub，服务器上git pull。

---

## 九、本地运行教程

```bash
# 安装依赖
pip install flask

# 启动后端服务
python app.py
```

浏览器打开 http://127.0.0.1:5000

启动后自动拉起 ngrok，控制台会打印公网地址。

---

## 十、后续迭代规划

- 自动生成文章右侧目录锚点
- 完善评论通知、评论互通
- 优化图片存储方案（改为文件服务器，减少数据库体积）
- 增加文章标签检索功能
- 对接更多第三方登录渠道

---

## 十一、项目开源地址

https://github.com/Wasd2490/my_blog_V1.3

线上体验：https://xue12.pythonanywhere.com

如果这个项目对你有帮助，欢迎Star收藏，评论区交流问题！

---

**联系我：**
- GitHub：https://github.com/Wasd2490
- CSDN：https://blog.csdn.net/wjcjjsjs
- 邮箱：3287316014@qq.com

开源协议：MIT协议，仅供学习交流，可自由修改二次开发，分发时保留原作者出处。

**著作权归 @谁暖了冬季 所有**

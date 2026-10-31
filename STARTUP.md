# 启动指南

## 最快的方式：双击

进项目根目录，双击 **`start.bat`**，等约 10 秒会自动打开浏览器。

```
C:\Users\18886\Doubao\chats\2026-10-21\new-chat\my_blog_V2\start.bat
```

它会按顺序做完四件事，每步都有提示：

1. 检查 PostgreSQL，没运行就启动它
2. 等数据库可以连接（最多 20 秒）
3. 检查构建产物 `.next/BUILD_ID`，没有就自动构建（2–5 分钟，只有第一次会等）
4. 启动网站并打开 http://localhost:3005

> 会弹出一个标题为 **BlogV2-Server** 的黑窗口，**别关它**，关掉网站就停了。

用完想停：双击 **`stop.bat`**（只停网站，数据库留着）。要连数据库一起停：命令行运行 `stop.bat /db`。

改代码时双击 **`dev.bat`**（开发模式，存盘自动刷新，不用重新构建）。

| 脚本 | 用途 | 端口 |
|---|---|---|
| `start.bat` | 生产模式（最快，用已构建好的产物） | 3005 |
| `dev.bat` | 开发模式（改代码自动刷新） | 3005 |
| `stop.bat` | 停止网站；加 `/db` 连数据库一起停 | — |

三个脚本都支持指定端口：`start.bat 4000`。

---

## 为什么必须先有数据库

这个博客的文章、评论、用户都存在 **PostgreSQL** 里，不是 SQLite 文件了。数据库不启动，网站能开但所有页面会报 500。

数据库是装在本机的便携版，不是系统服务，**每次开机后要手动启动一次**（`start.bat` 已经帮你做了）：

```
程序目录：C:\Users\18886\postgres
数据目录：C:\Users\18886\pgdata
账号密码：blog / blog123
数据库名：blog_v2，端口 5432
```

手动启停：

```bash
# 启动
"C:\Users\18886\postgres\bin\pg_ctl.exe" -D "C:\Users\18886\pgdata" -l "C:\Users\18886\pgdata\server.log" start

# 停止
"C:\Users\18886\postgres\bin\pg_ctl.exe" -D "C:\Users\18886\pgdata" stop

# 检查是否在跑（看到 accepting connections 就是正常）
"C:\Users\18886\postgres\bin\pg_isready.exe" -h localhost -p 5432
```

---

## 命令行启动（不用脚本）

数据库已在跑的前提下，两条命令：

```bash
cd C:\Users\18886\Doubao\chats\2026-10-21\new-chat\my_blog_V2

npx next start -p 3005      # 已有构建产物时，1 秒就绪
npx next dev -p 3005        # 开发模式
```

> ⚠️ 需要构建/重新构建时，**Windows 上必须加 `--webpack`**：
> `npx next build --webpack`
> Next.js 16 默认的 Turbopack 在本机会卡死（编译阶段无输出，10 分钟以上不动）。

---

## 换一台机器 / 重新部署

```bash
# 1. 装依赖（postinstall 会自动跑 prisma generate）
npm install

# 2. 配环境变量
cp .env.example .env
#    必改：DATABASE_URL、SESSION_SECRET（≥32 位）、NEXT_PUBLIC_SITE_URL

# 3. 建表（含全文索引）
npx prisma migrate deploy

# 4. 导入 V1 数据（可选，幂等，重复跑不产生脏数据）
npm run export:v1 && npm run import:v1

# 5. 构建并启动
npx next build --webpack
npx next start -p 3005
```

首次进后台要有管理员账号：第一个注册的用户自动成为 ADMIN；从 V1 迁移过来的话，`test@test.com` 已经是 ADMIN。

---

## 出问题先看这里

| 现象 | 原因 | 处理 |
|---|---|---|
| 页面 500、提示数据库连接失败 | PostgreSQL 没起 | 双击 `start.bat`，或手动跑上面的启动命令 |
| 双击 `start.bat` 后浏览器打不开 | 端口被别的程序占了 | 换端口：`start.bat 4000` |
| 改了代码但页面没变化 | 用的是生产模式（`start.bat`） | 生产模式读的是构建产物，改用 `dev.bat`，或重新 `npx next build --webpack` |
| 构建卡住十分钟没动静 | Turbopack 老毛病 | 一定加 `--webpack` |
| `npm install` 后报 Prisma 找不到 | 没生成客户端 | 跑 `npx prisma generate` |
| 忘了管理员密码 | — | 见 README「首次进入后台」一节，或直接改库 |

---

## 站点地址

启动后这几个地址可用：

```
首页       http://localhost:3005/
文章列表   http://localhost:3005/blog
后台登录   http://localhost:3005/login        账号 test@test.com / admin12345
管理后台   http://localhost:3005/admin
RSS        http://localhost:3005/feed.xml
Sitemap    http://localhost:3005/sitemap.xml
```

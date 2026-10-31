// 博客 V2 Service Worker
// 策略：静态资源走缓存优先；HTML 页面与 API 走网络优先（保证内容实时）
// v3：V2.5 视觉改版，旧缓存的 CSS/JS 必须失效
const CACHE = 'blog-v2-static-v3'
const STATIC_ASSETS = ['/', '/manifest.json', '/offline.html']

// 视频/音乐体积大（单个 40MB），绝不能进缓存，否则瞬间撑爆 Cache Storage 配额
const NEVER_CACHE = /^\/(videos|music|uploads)\//

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  const isStatic = /\.(js|css|png|jpg|jpeg|gif|svg|webp|woff2?)$/i.test(url.pathname)
  const isApi = url.pathname.startsWith('/api/')

  // 静态资源：缓存优先（大媒体除外，直接走网络）
  if (isStatic && !NEVER_CACHE.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
            return res
          })
      )
    )
    return
  }

  // API：只走网络
  if (isApi) return

  // 页面：网络优先，失败回落离线页
  event.respondWith(
    fetch(req).catch(() =>
      caches.match(req).then((hit) => hit || caches.match('/offline.html'))
    )
  )
})

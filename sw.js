/* 课表 Web App 的 Service Worker
   - 导航请求（页面本身）：网络优先，拿不到网才用缓存 → 保证一打开就是最新版
   - 静态资源：缓存优先，后台顺手更新
*/
const CACHE = "kb2601-v6";
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES.map(u => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function put(req, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // 页面导航：网络优先
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-store" })
        .then(res => put(req, res))
        .catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // 其他资源：缓存优先 + 后台更新
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        fetch(req).then(res => put(req, res)).catch(() => {});
        return hit;
      }
      return fetch(req)
        .then(res => put(req, res))
        .catch(() => caches.match("./index.html"));
    })
  );
});

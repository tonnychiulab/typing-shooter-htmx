// ==========================================
// SERVICE WORKER - Typing Defender PWA
// 策略：Cache-First（離線優先）
// 雙環境相容：本地 Node.js（/）+ GitHub Pages（/typing-shooter-htmx/）
// ==========================================

const CACHE_VERSION = 'typing-defender-v1.4.0';
const CACHE_NAME = CACHE_VERSION;

// 自動偵測 scope（本地 '/' vs GitHub Pages '/typing-shooter-htmx/'）
const SCOPE = self.registration.scope;
const BASE = new URL(SCOPE).pathname; // e.g. '/' or '/typing-shooter-htmx/'

// 需要預快取的核心靜態資源
const PRECACHE_ASSETS = [
    BASE,
    BASE + 'index.html',
    BASE + 'game.js',
    BASE + 'game/constants.js',
    BASE + 'game/audio.js',
    BASE + 'game/a11y.js',
    BASE + 'game/ai-pilot.js',
    BASE + 'game/static-host.js',
    BASE + 'game/engine.js',
    BASE + 'style.css',
    BASE + 'manifest.json',
    BASE + 'assets/icon-192.jpg',
    BASE + 'assets/icon-512.jpg'
];

// ── Install：預快取所有核心資源 ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching core assets:', PRECACHE_ASSETS);
            // 允許個別資源快取失敗（避免一個資源 404 導致整個 SW 安裝失敗）
            return Promise.allSettled(
                PRECACHE_ASSETS.map(url =>
                    cache.add(url).catch(err =>
                        console.warn('[SW] Failed to cache:', url, err)
                    )
                )
            );
        }).then(() => {
            console.log('[SW] Installation complete. Version:', CACHE_VERSION);
            // 立即激活，不等待舊的 SW 退場
            return self.skipWaiting();
        })
    );
});

// ── Activate：清除舊版快取 ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Activated. Claiming clients...');
            return self.clients.claim();
        })
    );
});

// ── Fetch：Cache-First 策略 ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 排除不快取的請求：
    // 1. 非 GET 請求（POST 提交戰績等）
    // 2. API 路徑（/api/score, /api/leaderboard）→ 讓它正常走網路
    // 3. Chrome 擴充套件與其他非 http(s) 協議
    if (event.request.method !== 'GET') return;
    if (url.pathname.includes('/api/')) return;
    if (!url.protocol.startsWith('http')) return;

    // HTMX CDN（unpkg.com）→ 走網路優先，回退快取
    if (url.hostname === 'unpkg.com') {
        event.respondWith(networkFirstWithCache(event.request));
        return;
    }

    // 所有本地靜態資源 → Cache-First
    event.respondWith(cacheFirst(event.request));
});

// ── Cache-First：先讀快取，快取沒有再去網路並更新快取 ─────────────────────
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        // 背景靜默更新（讓下次訪問更新，不阻塞本次）
        fetchAndCache(request).catch(() => {});
        return cached;
    }
    return fetchAndCache(request);
}

// ── Network-First with Cache Fallback（用於 CDN 資源）────────────────────
async function networkFirstWithCache(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        // CDN 離線時回傳空白腳本，避免遊戲崩潰（HTMX 功能降級）
        return new Response('/* HTMX offline fallback */', {
            headers: { 'Content-Type': 'application/javascript' }
        });
    }
}

// ── 網路請求並更新快取 ─────────────────────────────────────────────────────
async function fetchAndCache(request) {
    const response = await fetch(request);
    if (response.ok && response.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
    }
    return response;
}

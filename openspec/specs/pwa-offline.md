# OpenSpec Domain: PWA 與離線快取規範 (PWA & Offline System)

---

### 1. 核心定位 (PWA Objectives)
《Typing Defender》具備完整 Progressive Web App 特性，支援：
1. **桌面與行動端獨立視窗安裝**（Add to Home Screen / Install App）。
2. **斷網離線運作**（所有核心遊戲資產由 Service Worker 快取，無網路依然可流暢戰鬥）。
3. **自適應 Scope 註冊**（無縫切換 本機根路徑 `/` 與 GitHub Pages 子路徑 `/typing-shooter-htmx/`）。

---

### 2. 靜態資產快取白名單 (Cache Whitelist)

Service Worker (`sw.js`) 在安裝階段（`install` 事件）必須預載並嚴格鎖定以下核心資產：

```javascript
const CACHE_NAME = 'typing-defender-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './game.js',
    './manifest.json',
    './game/constants.js',
    './game/audio.js',
    './game/a11y.js',
    './game/ai-pilot.js',
    './game/static-host.js',
    './game/engine.js',
    './assets/icon-192.jpg',
    './assets/icon-512.jpg'
];
```

> [!IMPORTANT]
> **資安防護邊界**：
> 伺服端程式碼 `server.js`、資料庫檔案 `scores.json`、測試檔 `test-*.js`、版本庫 `.git` **嚴禁列入快取白名單**。

---

### 3. 快取更新與使用者提示機制 (Cache Update Strategy)

#### 3.1 啟用階段舊快取清理 (Activate)
在 Service Worker `activate` 事件中，歷遍 `caches.keys()`，凡快取名稱與當前 `CACHE_NAME` 不符者，立即執行 `caches.delete(key)`，確保客戶端不殘留過期舊代碼。

#### 3.2 新版本提示 (Update Found Banner)
在 `index.html` 的 Service Worker 註冊監聽中：
```javascript
reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing;
    newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 彈出輕量提示條：「發現新版本防衛核心，請重新載入頁面」
            showPwaUpdateToast();
        }
    });
});
```

---

### 4. 路由請求策略 (Fetch Routing Strategy)

* **靜態資產（HTML / CSS / JS / 圖片）**：
  採用 **Cache-First（快取優先）** 策略，命中快取立即回傳；快取未命中時才發起網路請求，並於成功後自動納入快取。
* **API 請求（`/api/*`）**：
  不走 Service Worker 快取，由 HTMX 與 `game/static-host.js` 的前端攔截器直接管理。

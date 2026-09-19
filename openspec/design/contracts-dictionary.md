# OpenSpec Design: 核心契約字典 (Contracts Dictionary)

> [!IMPORTANT]
> **開發守則**：本文件定義專案中所有跨模組、跨語言（HTML/CSS/JS）的字串契約。
> 人類工程師或 AI 在撰寫程式碼時，**嚴禁自行創造、拼寫簡寫或私自更改表列中的任何名稱**。任何未經本規格書定義的 Class 或 ID 操作，一律視為重大缺陷。

---

### 1. DOM ID 字典表 (DOM IDs Dictionary)

| DOM ID | 擁有/查詢模組 | 所屬標籤 | 規格與行為規範 |
| :--- | :--- | :--- | :--- |
| `#game-container` | `style.css` | `<div id="game-container">` | 遊戲主視窗外框，長輩模式下縮小 padding 讓出戰場空間。 |
| `#battlefield` | `engine.js` | `<main id="battlefield">` | 戰鬥主戰場，物理掉落目標物的主容器。 |
| `#targets-container` | `engine.js` | `<div id="targets-container">` | 目標字元動態節點注入父層。 |
| `#fx-layer` | `engine.js` | `<svg id="fx-layer">` | 雷射光束動態 `<line>` 與爆炸動態特效畫布。 |
| `#cannon` | `engine.js` | `<div id="cannon">` | 底部砲台，雷射光發射起點座標來源。 |
| `#keyboard-dock` | `style.css` | `<footer id="keyboard-dock">` | 底部虛擬鍵盤基座，長輩模式下擴大高度至 220px。 |
| `#virtual-keyboard` | `engine.js` | `<div id="virtual-keyboard">` | 虛擬鍵盤 60 鍵生成容器。 |
| `#a11y-toggle-btn` | `a11y.js` | `<button id="a11y-toggle-btn">` | **頂部 HUD 大字切換鈕**。啟動時必須同步添加 `.active`。 |
| `#a11y-status-label` | `a11y.js` | `<strong id="a11y-status-label">` | 頂部 HUD 大字狀態文字，嚴格遵循 `['開啟', '關閉']`。 |
| `#modal-a11y-toggle-btn` | `a11y.js` | `<button id="modal-a11y-toggle-btn">` | **開始視窗大字切換鈕**。必須與 HUD 鈕雙向同步，支援金黃色高亮發光樣式。 |
| `#modal-a11y-label` | `a11y.js` | `<span id="modal-a11y-label">` | 開始視窗大字狀態文字，嚴格遵循 `['開啟', '關閉']`。 |
| `#view-leaderboard-btn` | `static-host.js` | `<button id="view-leaderboard-btn">` | **查看英雄榜按鈕**。支援 HTMX 請求與直接點擊展開/收合 Toggle 備援。 |
| `#start-leaderboard-box` | `static-host.js` | `<div id="start-leaderboard-box">` | 開始視窗英雄榜掛載容器，接收排行榜 HTML 片段。 |
| `#shield-container` | `a11y.js` | `<div id="shield-container">` | HUD 護盾顯示面板，非無障礙模式下為 `display: none`。 |
| `#shield-display` | `a11y.js` | `<span id="shield-display">` | 護盾剩餘數字文字（格式：`🛡️ 3`）。 |
| `#score-display` | `engine.js` | `<span id="score-display">` | 監聽 `scoreUpdated from:body`，由 HTMX swap 得分數值。 |
| `#combo-display` | `engine.js` | `<span id="combo-display">` | 監聽 `comboUpdated from:body`，由 HTMX swap 連擊數值。 |
| `#health-bar` | `engine.js` | `<div id="health-bar">` | 玩家生命條，寬度百分比由 `health%` 動態指定。 |
| `#ai-toggle-btn` | `ai-pilot.js` | `<button id="ai-toggle-btn">` | AI 副駕駛開關鈕，按 Tab 鍵或點擊切換。 |
| `#ai-status-label` | `ai-pilot.js` | `<strong id="ai-status-label">` | AI 副駕駛狀態文字，嚴格遵循 `['運作中', '關閉']`。 |
| `#ai-decision-display` | `ai-pilot.js` | `<span id="ai-decision-display">` | 底部 AI 雷達決策跑馬燈，顯示鎖定目標與倒數秒數。 |
| `#overlay` | `engine.js` | `<div id="overlay">` | 遊戲開始與說明遮罩層，遊戲進行時帶有 `.hidden`。 |
| `#gameover-overlay` | `engine.js` | `<div id="gameover-overlay">` | 遊戲結束結算遮罩層，監聽 `gameOver from:body` 觸發。 |

---

### 2. CSS 動態類別契約 (CSS Classes Contract)

任何 JavaScript 程式碼中透過 `classList.add()`, `remove()`, `toggle()` 操作的類別，**必須且只能** 使用下列清單：

| CSS 類別名稱 | 綁定宿主 (Element) | 觸發模組 | `style.css` 規則對齊 | 視覺與行為影響 |
| :--- | :--- | :--- | :--- | :--- |
| **`.a11y-mode`** | `document.body` | `a11y.js` | `.a11y-mode ...` (第 1200+ 行) | **絕對核心類別**。啟動後全戰場目標放大至 68px、鍵盤放大、說明放大。嚴禁擅改或漏加！ |
| **`.a11y-big-font`** | `document.body` | `a11y.js` | 保留相容別名 | 輔助標記，與 `.a11y-mode` 同步增減。 |
| **`.active`** | 按鈕本體 | `a11y.js`, `ai-pilot.js` | `.a11y-toggle-button.active`, `#modal-a11y-toggle-btn.active` | 按鈕發光高亮狀態（AI 藍綠光、長輩金黃光）。 |
| **`.vkey-guided`** | `.vkey` 虛擬鍵 | `a11y.js` | `.vkey-guided` | **長輩鍵盤指引燈**。以青色光圈高亮標註最急迫威脅目標的按鍵。 |
| **`.vkey-guided-shift`** | Shift 鍵 `.vkey` | `a11y.js` | `.vkey-guided-shift` | 當急迫目標為大寫字母或特殊符號時，高亮左右 Shift 鍵。 |
| **`.vkey-active`** | `.vkey` 虛擬鍵 | `engine.js` | `.vkey-active` | 玩家或 AI 按下該鍵瞬間的高亮跳動反饋（持續 120ms）。 |
| **`.target-node`** | 目標 DOM | `engine.js` | `.target-node` | 戰場掉落字元方框基準類別。 |
| **`.char-upper`** | 目標 DOM | `engine.js` | `.target-node.char-upper` | 大寫英文字母（帶有金黃霓虹色標籤）。 |
| **`.char-symbol`** | 目標 DOM | `engine.js` | `.target-node.char-symbol` | 特殊符號（帶有紫色霓虹色標籤）。 |
| **`.char-number`** | 目標 DOM | `engine.js` | `.target-node.char-number` | 數字（帶有綠色霓虹色標籤）。 |
| **`.hidden`** | Overlay 遮罩 | `engine.js` | `.overlay.hidden` | 將遮罩設為 `display: none; opacity: 0;`。 |

---

### 3. 自定義事件契約 (Custom DOM Events Contract)

| 事件名稱 | 派發源 (Dispatcher) | 監聽對象 (Target) | 酬載資料 (Event Detail) |
| :--- | :--- | :--- | :--- |
| **`scoreUpdated`** | `engine.js` | `document.body` | `{ score: number }` |
| **`comboUpdated`** | `engine.js` | `document.body` | `{ combo: number }` |
| **`statusUpdated`** | `engine.js` | `document.body` | `{ statusText: string }` |
| **`gameOver`** | `engine.js` | `document.body` | `{ score, maxCombo, accuracy, hits, totalShots, duration_s, isAiPilot, aiModel }` |

---

### 4. HTMX 屬性與攔截契約 (HTMX Contracts)

| 觸發來源 | HTMX 屬性定義 | 線上端點 (Online) | 靜態攔截 (Static Intercept) |
| :--- | :--- | :--- | :--- |
| **#view-leaderboard-btn** | `hx-get="/api/leaderboard"`<br>`hx-target="#start-leaderboard-box"`<br>`hx-swap="innerHTML"` | `GET /api/leaderboard`<br>回傳前 10 名排行榜 HTML | 攔截 `htmx:beforeRequest`<br>路徑來源：`evt.detail.requestConfig.path`<br>阻止預設請求並調用 `renderClientLeaderboardHtml()` |
| **#score-form (結束畫面)** | `hx-post="/api/score"`<br>`hx-target="#leaderboard-container"`<br>`hx-swap="innerHTML"` | `POST /api/score`<br>儲存至 `scores.json` 並回傳最新榜單 | 攔截 `htmx:beforeRequest`<br>參數來源：`evt.detail.requestConfig.parameters`<br>寫入 `localStorage` 並回傳最新榜單 |

---

### 5. 儲存金鑰字典 (Storage Keys Dictionary)

| 儲存 Key | 介面型態 | 預設值 | 說明 |
| :--- | :--- | :--- | :--- |
| `typing_defender_a11y` | `string` (`"true"` \| `"false"`) | `"false"` | 記錄無障礙大字開關狀態，刷新頁面時自動載入。 |
| `typing_defender_scores` | `string` (JSON 陣列) | 內建 5 筆前導紀錄 | 靜態環境下離線儲存玩家戰績（最多保留 50 筆）。 |

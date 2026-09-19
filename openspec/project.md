# OpenSpec: Typing Defender (打字防衛戰・極簡終端模式)
## 專案設計總綱與架構哲學 (Project Vision & Architecture)

---

### 1. 專案願景 (Vision)
《Typing Defender》是一款以賽博龐克終端機風格為視覺核心、基於現代純原生 Web 技術與 HTMX 建構的極速打字防衛戰網頁遊戲。
本專案的最高工程原則為：**「零打包依賴、極致輕量、規格驅動（Spec-Driven）、老少咸宜（長輩無障礙 + AI 輔助）」**。

---

### 2. 核心架構哲學 (Core Architecture Philosophy)

#### 2.1 零工具鏈堆疊 (Zero Bundler & Zero Tooling Hell)
* **無 Webpack / Vite / Rollup**：專案不依賴任何編譯與打包工具，前端完全基於現代原生 HTML5、CSS3 與 ES6+ JavaScript。
* **雙擊即開發**：人類工程師只要打開 `index.html`，或啟動任何極簡靜態伺服器，即可進行完整遊戲功能開發與除錯，絕無環境配置門檻。

#### 2.2 雙軌運行模式 (Dual-Mode Execution Architecture)
專案天生具備跨環境部署韌性：
1. **完整伺服端模式 (Full-Stack Mode)**：
   * 運行於 Node.js 原生伺服器 (`server.js`)。
   * 排行榜透過 HTMX 與伺服端 REST API 交換動態 HTML 片段，伺服端提供嚴格資安防護（CSP、IP 限流、XSS 淨化、Schema v2 儲存）。
2. **純靜態雲端模式 (Static Cloud / Offline Mode)**：
   * 部署於 GitHub Pages 或直接以 `file://` 協議離線開啟。
   * 由前端模組 (`static-host.js`) 在瀏覽器內部精確攔截 HTMX 請求，自動切換為本地端 `localStorage` 本地雲端儲存，提供完全一致的使用者體驗。

#### 2.3 規格驅動開發 (Spec-Driven Development)
* 本 `openspec/` 目錄為整個專案的**唯一單一真實來源 (Single Source of Truth, SSOT)**。
* 任何程式碼修改、模組重構或新功能加入，**必須嚴格對齊本規格書中的 DOM ID、CSS Class、事件名稱與資料結構契約**，嚴禁憑直覺臆測或硬編碼隨意命名。

---

### 3. 技術棧選型與邊界 (Tech Stack & Constraints)

| 維度 | 選型 | 說明與約束 |
| :--- | :--- | :--- |
| **渲染層** | 原生 DOM + SVG | 戰鬥核心由 `div.target-node` 與 SVG 特效層 (`#fx-layer`) 渲染，維持極低 CPU 耗損。 |
| **樣式層** | 原生 CSS3 變數與 Flex/Grid | 賽博龐克綠/藍/黃霓虹配色，無 Sass/Tailwind，使用純 CSS 變數定義全域主題。 |
| **動態互動** | HTMX 1.9.12 (CDN) | 以超文本驅動前端局部更新，包含得分同步、連擊跳動、遊戲結束統計與排行榜渲染。 |
| **音效層** | Web Audio API | 不使用任何外部音效 MP3/WAV 檔案，全域合成音階（雷射震盪波、爆炸雜訊、護盾吸收音）。 |
| **後端伺服** | Node.js 原生 HTTP 模組 | 零 npm 依賴庫（不用 Express），純粹使用 Node.js 核心庫 `http`, `fs`, `path`。 |
| **離線支援** | PWA Service Worker (`sw.js`) | 支援靜態資源快取白名單、自適應 Scope 偵測與新版發布通知。 |

---

### 4. 非功能性需求指標 (NFR - Non-Functional Requirements)

1. **幀率穩定度**：戰鬥主迴圈必須穩定保持在 **60 FPS**（單幀耗時不得超過 16.6ms）。
2. **輸入延遲**：按鍵事件自 `keydown` 觸發到雷射光束與目標爆破渲染，延遲必須小於 **16ms**（1 幀以內）。
3. **無障礙相容度**：長輩無障礙模式下，目標方框尺寸必須達到至少 **68px × 68px**，字級不小於 **2.6rem**，並具備即時鍵盤指引燈。
4. **資源輕量度**：整體靜態檔案（不計第三方 HTMX CDN）總傳輸體積不得超過 **100 KB**。
5. **資安合規**：後端強制啟用 CSP Level 2，禁止未授權第三方腳本，API 請求嚴格限制 50KB Payload 與 1.2 秒 IP 防刷限流。

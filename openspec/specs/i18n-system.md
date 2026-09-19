# OpenSpec Domain: 多國語系與在地化規範 (i18n & Localization System)

---

### 1. 系統邊界與核心原則 (Scope & Boundary)

#### 1.1 可翻譯與不可翻譯邊界
* **可翻譯範疇 (Translatable Scope)**：
  * 首頁靜態文字與操作指示（標題、副標、說明卡片、按鈕）。
  * 頂部 HUD 看板標籤（得分、連擊、生命、狀態、AI/大字開關標籤）。
  * 戰鬥結束統計報告彈窗（各項指標名稱、呼號輸入提示、再戰按鈕）。
  * AI 副駕駛雷達跑馬燈即時廣播字串。
  * 排行榜表格標題、表頭欄位（排名、駕駛呼號、得分...）與狀態提示。
* **嚴禁翻譯範疇 (Strict Non-Translatable Boundary)**：
  * **戰場目標字元 (Target Characters)**：所有掉落字元（`a-z`, `A-Z`, `0-9`, 符號）映射自實體鍵盤單鍵射擊反應，**嚴禁套用語系翻譯**。
  * **程式識別代碼 (System Keys)**：AI 模型 ID（`rookie`, `veteran`, `god`）、事件名稱、DOM ID 與 CSS 類別名稱。

---

### 2. 語系支援與風格定位 (Supported Locales & Tone)

專案首波支援兩種語系：
1. **`zh-TW` (繁體中文，預設)**：精煉、清晰、具備動漫與賽博終端感的科技中文。
2. **`en-US` (美式賽博終端英文)**：硬派軍事賽博龐克風格（如使用 `ENGAGE COMBAT`, `TELEMETRY`, `CALLSIGN`, `CRITICAL PURGE` 而非生活化口語）。

---

### 3. 架構設計：極簡原生字典模組 (`game/i18n.js`)

不依賴任何外部第三方套件，由輕量單一模組實現純原生字典查詢與發布訂閱：

```javascript
// game/i18n.js 規格標準
const TRANSLATION_MAP = {
    'zh-TW': {
        'game.title': 'TYPING DEFENDER',
        'game.subtitle': '打字防衛戰・極簡終端模式',
        'btn.start': '🕹️ 親自參戰 [空白鍵]',
        'btn.ai_launch': '🤖 啟動 AI 副駕駛',
        'btn.a11y': '👁️ 長輩無障礙大字:',
        'btn.leaderboard': '🏆 查看英雄榜',
        'hud.score': '得分',
        'hud.combo': '連擊',
        'hud.health': '生命',
        'hud.status': '狀態',
        'status.ready': '準備就緒',
        'status.active': '作戰中',
        'status.overload': '系統過載',
        'radar.standby': '待命中',
        'radar.searching': '搜尋天際目標中...',
        'radar.locked': '鎖定目標 [{char}] 墜落倒數: {sec}秒',
        'radar.panic_emp': '⚡ 緊急狀況：AI 啟動 EMP 核彈！',
        'report.title': '打字防衛戰・陣地失守統計報告',
        'report.total_score': '防衛總得分',
        'report.max_combo': '最高連擊',
        'report.accuracy': '命中率',
        'report.duration': '作戰總秒數',
        'report.callsign_placeholder': '輸入 1~16 碼駕駛呼號',
        'report.submit_btn': '登錄防衛英雄榜',
        'report.restart_btn': '再戰一局 [空白鍵]',
        'table.tag': 'CYBER_NET // 前十強防衛英雄榜',
        'table.rank': '排名',
        'table.name': '駕駛呼號',
        'table.score': '得分',
        'table.combo': '連擊',
        'table.accuracy': '命中率',
        'table.empty': '尚無防衛戰紀錄',
        'table.sync_ok': '✓ 戰績已同步登錄至 CYBER_NET 本地雲端榜！',
        'error.rate_limit': '⚠️ 提交過於頻繁，請稍後再試'
    },
    'en-US': {
        'game.title': 'TYPING DEFENDER',
        'game.subtitle': 'CYBERPUNK TERMINAL COMBAT DEFENSE',
        'btn.start': '🕹️ MANUAL ENGAGE [SPACE]',
        'btn.ai_launch': '🤖 LAUNCH AI PILOT',
        'btn.a11y': '👁️ ELDER A11Y MODE:',
        'btn.leaderboard': '🏆 LEADERBOARD',
        'hud.score': 'SCORE',
        'hud.combo': 'COMBO',
        'hud.health': 'HULL',
        'hud.status': 'STATUS',
        'status.ready': 'STANDBY',
        'status.active': 'ACTIVE COMBAT',
        'status.overload': 'CORE OVERLOAD',
        'radar.standby': 'STANDBY',
        'radar.searching': 'SCANNING AIRSPACE FOR THREATS...',
        'radar.locked': 'LOCKED [{char}] IMPACT IN: {sec}s',
        'radar.panic_emp': '⚡ CRITICAL: AI DETONATED EMP BOMB!',
        'report.title': 'TACTICAL DEFENSE DEBRIEF & LOSS TELEMETRY',
        'report.total_score': 'TOTAL SCORE',
        'report.max_combo': 'MAX COMBO',
        'report.accuracy': 'ACCURACY',
        'report.duration': 'DURATION',
        'report.callsign_placeholder': 'PILOT CALLSIGN (1-16 CHARS)',
        'report.submit_btn': 'SUBMIT TELEMETRY TO CYBER_NET',
        'report.restart_btn': 'RE-ENGAGE [SPACE]',
        'table.tag': 'CYBER_NET // GLOBAL TOP 10 PILOTS',
        'table.rank': 'RANK',
        'table.name': 'CALLSIGN',
        'table.score': 'SCORE',
        'table.combo': 'COMBO',
        'table.accuracy': 'ACCURACY',
        'table.empty': 'NO TELEMETRY LOGGED',
        'table.sync_ok': '✓ TELEMETRY SYNCED TO LOCAL CYBER_NET GRID!',
        'error.rate_limit': '⚠️ RATE LIMIT EXCEEDED, STANDBY'
    }
};
```

---

### 4. 宣告式 HTML 綁定與切換機制

#### 4.1 HTML 標籤聲明
在 HTML 中以 `data-i18n="<key>"` 屬性標記：
```html
<span class="hud-label" data-i18n="hud.score">得分</span>
<button id="start-btn" class="glow-button" data-i18n="btn.start">🕹️ 親自參戰 [空白鍵]</button>
```

#### 4.2 全域即時切換方法
```javascript
function applyLanguage(lang) {
    const dict = TRANSLATION_MAP[lang] || TRANSLATION_MAP['zh-TW'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.textContent = dict[key];
        }
    });
    // 儲存至 localStorage
    localStorage.setItem('typing_defender_lang', lang);
    document.documentElement.lang = lang;
}
```

---

### 5. HTMX 與後端語系同步契約 (HTMX & SSR Sync)

為防止靜態頁面與 HTMX 載入的排行榜表頭出現語系混雜：
1. **HTMX 全域請求標頭注入**：
   ```javascript
   document.body.addEventListener('htmx:configRequest', (evt) => {
       const currentLang = localStorage.getItem('typing_defender_lang') || 'zh-TW';
       evt.detail.headers['Accept-Language'] = currentLang;
       evt.detail.parameters['lang'] = currentLang;
   });
   ```
2. **`server.js` 與 `static-host.js` 渲染規格**：
   * 根據請求中的 `lang` 參數，動態選擇英文或中文表頭（`RANK` / `排名`，`CALLSIGN` / `駕駛呼號`）。

---

### 6. 防跑版排版防護契約 (Layout Shift Prevention)

英文字串平均字元長度高於中文（約長 30% ~ 60%），CSS 必須嚴格遵循以下排版防護：
1. **按鈕彈性包裹**：按鈕容器必須使用 `flex-wrap: wrap; gap: 10px;`。
2. **最小寬度保護**：`.glow-button`, `.submit-record-btn` 不得設置寫死的固定像素寬度（`width: 140px`），一律使用 `min-width: 130px; padding: 10px 18px;`。
3. **長輩無障礙大字模式相容**：在 `.a11y-mode` 下，允許按鈕自然撐寬，彈窗容器 `#overlay .modal` 最大寬度維持自適應（$780\text{px}$）。

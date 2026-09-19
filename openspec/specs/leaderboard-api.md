# OpenSpec Domain: 排行榜與 API 契約規範 (Leaderboard & API Contract)

---

### 1. 資料模型 Schema v2 規格 (Data Schema v2)

排行榜永久儲存於伺服端 `scores.json`（或前端 `localStorage['typing_defender_scores']`），嚴格遵循 Schema v2 結構：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "TypingDefenderScoresSchemaV2",
  "type": "object",
  "required": ["version", "updated_at", "records"],
  "properties": {
    "version": { "type": "integer", "const": 2 },
    "updated_at": { "type": "string", "format": "date-time" },
    "records": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "score", "maxCombo", "accuracy", "duration_s", "played_at"],
        "properties": {
          "id": { "type": "string", "pattern": "^rec-[0-9]+" },
          "name": { "type": "string", "minLength": 1, "maxLength": 16 },
          "score": { "type": "integer", "minimum": 0, "maximum": 500000 },
          "maxCombo": { "type": "integer", "minimum": 0, "maximum": 5000 },
          "accuracy": { "type": "integer", "minimum": 0, "maximum": 100 },
          "duration_s": { "type": "integer", "minimum": 0, "maximum": 86400 },
          "played_at": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

#### v1 舊資料向後相容遷移規則 (Migration Rules)
伺服端 `loadScores()` 讀取檔案時，若偵測為舊版 v1（純陣列）或缺少欄位：
1. 若缺少 `played_at`：優先以舊版 `date` 補綴為 ISO Timestamp，無則使用當前時間。
2. 若缺少 `duration_s`：預設補 `0`。
3. 自動將記憶體升級為 v2 Wrapper 物件，並在檔案系統許可時回寫持久化。

---

### 2. OpenAPI 3.0 介面契約 (REST API Specification)

```yaml
openapi: 3.0.0
info:
  title: Typing Defender Leaderboard API
  version: 2.0.0
paths:
  /api/leaderboard:
    get:
      summary: 取得前十強英雄榜 HTML 片段
      description: 回傳經過伺服端渲染、帶有 CSS class 的 HTML 表格片段，供 HTMX 直接注入 DOM。
      responses:
        '200':
          description: 排行榜 HTML 片段
          content:
            text/html; charset=utf-8:
              schema:
                type: string
                example: '<div class="leaderboard-card">...</div>'

  /api/score:
    post:
      summary: 提交對局新戰績
      description: 接收玩家得分，經由白名單校驗與限流過濾後寫入儲存，回傳最新包含高亮新紀錄的排行榜 HTML。
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              required: [name, score, maxCombo, accuracy]
              properties:
                name: { type: string, maxLength: 16 }
                score: { type: integer, minimum: 0 }
                maxCombo: { type: integer, minimum: 0 }
                accuracy: { type: integer, minimum: 0, maximum: 100 }
                duration_s: { type: integer, minimum: 0 }
      responses:
        '200':
          description: 最新排行榜 HTML（包含新紀錄動畫高亮）
          content:
            text/html; charset=utf-8:
              schema:
                type: string
        '429':
          description: 提交過於頻繁 (IP Cooldown: 1200ms)
          content:
            text/html; charset=utf-8:
              schema:
                type: string
                example: '<p style="color: var(--accent-red);">⚠️ 提交過於頻繁</p>'
```

---

### 3. 靜態部署環境 HTMX 攔截規範 (Static Host Interception)

在 GitHub Pages (`*.github.io`) 或本機離線 (`file://`) 環境下，`game/static-host.js` 必須精確遵循以下攔截契約：

1. **路徑提取契約**：
   ```javascript
   const path = evt.detail.requestConfig?.path || evt.detail.elt?.getAttribute('hx-get') || '';
   ```
   > [!CAUTION]
   > HTMX 的 `evt.detail` 物件**不包含頂層 `path` 屬性**。嚴禁使用 `detail.path`。

2. **攔截與本地持久化**：
   * 判定 `path.includes('/api/leaderboard')`：調用 `evt.preventDefault()`，自 `localStorage` 讀取並調用 `renderClientLeaderboardHtml()` 注入 `evt.detail.target`。
   * 判定 `path.includes('/api/score')`：調用 `evt.preventDefault()`，提取 `evt.detail.requestConfig.parameters`，寫入 `localStorage`，並回傳渲染結果。

3. **查看英雄榜按鈕 Toggle 契約**：
   * `#view-leaderboard-btn` 綁定直接點擊監聽：
     * 若 `#start-leaderboard-box` 內容已存在且顯示中，再次點擊切換為 `display: none`（收合）。
     * 若未展開，切換為 `display: block` 並渲染榜單（展開）。

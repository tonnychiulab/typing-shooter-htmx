# OpenSpec Domain: 長輩與無障礙系統規範 (Accessibility System)

---

### 1. 核心設計理念 (Elder-Friendly Philosophy)
長輩無障礙模式並非單純放大字體，而是從**視覺能見度、認知負擔減輕、操作容錯率**三大維度為銀髮長者量身打造的防衛機制。

---

### 2. 嚴格 CSS 契約與 DOM 規範 (CSS & DOM Contract)

#### 2.1 根層級 Class 規範
* 當無障礙模式啟用時，`document.body` **必須且只能** 掛載 class：`a11y-mode`（同時保留相容別名 `a11y-big-font`）。
* 當無障礙模式關閉時，必須完全自 `document.body` 移除上述 class。

#### 2.2 尺寸與排版規格表
| UI 元素 | 一般模式尺寸 | 長輩無障礙大字模式 (`.a11y-mode`) |
| :--- | :--- | :--- |
| **戰場目標方框 (`.target-node`)** | $44\text{px} \times 44\text{px}$，字級 1.5rem | **$68\text{px} \times 68\text{px}$**，字級 **2.6rem**，邊框加粗至 3px |
| **虛擬按鍵 (`.vkey`)** | 高度 $42\text{px}$，字級 1.05rem | **高度 $52\text{px}$**，字級 **1.5rem**，副標字級 0.95rem |
| **虛擬鍵盤底座 (`#keyboard-dock`)** | 高度 $170\text{px}$ | **高度 $220\text{px}$** |
| **說明彈窗 (`.modal`)** | 最大寬度 $640\text{px}$ | **最大寬度 $780\text{px}$**，內邊距 $32\text{px} \times 36\text{px}$ |
| **說明內文 (`.instructions p`)** | 字級 0.88rem | **字級 1.05rem**，行高 1.7 |
| **HUD 數據數值 (`.hud-value`)** | 字級 1.15rem | **字級 1.5rem** |

---

### 3. 雙按鈕即時雙向連動 (Dual-Button State Synchronization)

頁面中存在兩個大字模式控制按鈕：
1. **開始視窗按鈕**：`#modal-a11y-toggle-btn` (包含文字標籤 `#modal-a11y-label`)
2. **頂部 HUD 按鈕**：`#a11y-toggle-btn` (包含文字標籤 `#a11y-status-label`)

#### 同步行為演算法：
```javascript
setA11yMode(enable) {
    this.isA11yMode = Boolean(enable);
    this.game.isA11yMode = this.isA11yMode;

    // 1. 樣式切換
    if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('a11y-mode', this.isA11yMode);
        document.body.classList.toggle('a11y-big-font', this.isA11yMode);
    }

    // 2. 文字同步 (列舉: '開啟' | '關閉')
    const text = this.isA11yMode ? '開啟' : '關閉';
    if (this.a11yStatusLabel) this.a11yStatusLabel.textContent = text;
    if (this.modalA11yLabel) this.modalA11yLabel.textContent = text;

    // 3. 按鈕發光樣式同步
    if (this.a11yToggleBtn) {
        this.a11yToggleBtn.classList.toggle('active', this.isA11yMode);
    }
    if (this.modalA11yBtn) {
        this.modalA11yBtn.classList.toggle('active', this.isA11yMode);
        this.modalA11yBtn.style.background = this.isA11yMode ? 'rgba(235, 172, 38, 0.25)' : '';
        this.modalA11yBtn.style.boxShadow = this.isA11yMode ? '0 0 10px rgba(235, 172, 38, 0.4)' : '';
    }

    // 4. 持久化存入 localStorage
    try {
        localStorage.setItem('typing_defender_a11y', this.isA11yMode ? 'true' : 'false');
    } catch (e) {}
}
```

---

### 4. 長輩新手三大守護寶物 (The 3 Starter Treasures)

當以無障礙模式開始遊戲時，系統自動發放三大守護寶物：

#### 寶物一：滿裝 EMP 核彈（開局贈 3 枚）
* 初始核彈槽上限擴增為 3（顯示第 3 格 `#bomb-slot-3`）。
* 開局直接給予 **3 枚滿裝核彈**，長輩遇到滿屏危機可隨時連發全殲。

#### 寶物二：免死防護罩（開局贈 🛡️x3）
* 初始護盾數為 **3**，顯示於 HUD `#shield-container`。
* **吸收防護機制**：當目標字元穿透底線時，優先調用 `absorbBreachWithShield()`：
  * 若護盾 > 0：**扣減 1 枚護盾，生命值 HP 0 損耗**，發射護盾吸收藍光音效。
  * 僅在護盾降為 0 後，後續穿透才開始扣除玩家生命值。

#### 寶物三：動態鍵盤指引燈 (Keyfinder Guide Light)
* 在非 AI 接管狀態下，系統實時追蹤當前戰場上**最接近底部（Y 座標最大）**的急迫目標。
* 自動在虛擬鍵盤對應鍵位點亮青色發光圈（`.vkey-guided`）。
* **Shift 鍵連動判定**：若該目標字元為大寫英文字母（A-Z）或上排特殊符號（例如 `!`、`@`、`#`），系統會**同步點亮左右兩側的 Shift 鍵**（`.vkey-guided-shift`），引導長輩進行雙鍵組合輸入。

(function () {
    const {
        CHAR_SETS,
        DIFFICULTY_MULTIPLIER,
        getCharDifficulty,
        ALL_CHARS,
        SYMBOL_ANNOTATIONS,
        AI_MODELS,
        KEYBOARD_LAYOUT
    } = typeof require !== 'undefined'
        ? require('./constants.js')
        : (window.TypingGameConstants || {});

    const { AudioEngine } = typeof require !== 'undefined'
        ? require('./audio.js')
        : (window.TypingGameAudio || {});

    const { A11yManager } = typeof require !== 'undefined'
        ? require('./a11y.js')
        : (window.TypingGameA11y || {});

    const { AIPilot } = typeof require !== 'undefined'
        ? require('./ai-pilot.js')
        : (window.TypingGamePilot || {});

    class TypingGame {
    constructor() {
        this.battlefield = document.getElementById('battlefield');
        this.targetsContainer = document.getElementById('targets-container');
        this.fxLayer = document.getElementById('fx-layer');
        this.cannonBarrel = document.querySelector('.cannon-barrel');
        this.cannon = document.getElementById('cannon');
        this.startModal = document.getElementById('overlay');
        this.gameOverOverlay = document.getElementById('gameover-overlay');
        this.lastKeyDisplay = document.getElementById('last-key-display');
        this.startBtn = document.getElementById('start-btn');
        this.virtualKeyboard = document.getElementById('virtual-keyboard');
        this.bombSlot1 = document.getElementById('bomb-slot-1');
        this.bombSlot2 = document.getElementById('bomb-slot-2');
        this.bombSlot3 = document.getElementById('bomb-slot-3');
        this.bombHint = document.getElementById('bomb-hint');
        this.spaceKeyElement = null;

        // 武器與 EMP 核彈大招系統
        this.bombs = 0;
        this.maxBombs = 2;
        this.bombScoreMilestone = 60;
        this.lastBombScoreThreshold = 0;

        // 子系統實體化
        this.audio = new AudioEngine();
        this.a11y = new A11yManager(this);
        this.pilot = new AIPilot(this);

        // 建立虛擬鍵盤與字元快取對映表
        this.charToKeyMap = new Map();
        this.shiftKeyElements = [];
        this.buildVirtualKeyboard();
        this.updateBombUI();

        // 遊戲核心數值狀態
        this.isPlaying = false;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.health = 100;
        this.maxHealth = 100;
        this.hits = 0;
        this.misses = 0;
        this.gameStartTime = 0;

        // 實體管理
        this.targets = [];
        this.targetIdCounter = 0;
        this.spawnTimer = null;
        this.lastTime = 0;
        this.baseSpeed = 45; // 像素/秒
        this.spawnInterval = 1400; // 毫秒（基礎生成間隔）
        this.minSpawnInterval = 600; // 毫秒（最快生成節奏）

        this.bindEvents();
    }

    // ── 子系統狀態代理 (Getter / Setter) ──────────────────────────────────
    get currentAiModelKey() {
        return this.pilot ? this.pilot.currentAiModelKey : 'veteran';
    }
    set currentAiModelKey(val) {
        if (this.pilot) this.pilot.currentAiModelKey = val;
    }

    get isAiPilot() {
        return this.pilot ? this.pilot.isAiPilot : false;
    }
    set isAiPilot(val) {
        if (this.pilot) this.pilot.isAiPilot = val;
    }

    get aiTimer() {
        return this.pilot ? this.pilot.aiTimer : null;
    }
    set aiTimer(val) {
        if (this.pilot) this.pilot.aiTimer = val;
    }

    get aiIsExecuting() {
        return this.pilot ? this.pilot.aiIsExecuting : false;
    }
    set aiIsExecuting(val) {
        if (this.pilot) this.pilot.aiIsExecuting = val;
    }

    get lockedTargetId() {
        return this.pilot ? this.pilot.lockedTargetId : null;
    }
    set lockedTargetId(val) {
        if (this.pilot) this.pilot.lockedTargetId = val;
    }

    get isA11yMode() {
        return this.a11y ? this.a11y.isA11yMode : false;
    }
    set isA11yMode(val) {
        if (this.a11y) this.a11y.isA11yMode = Boolean(val);
    }

    get shields() {
        return this.a11y ? this.a11y.shields : 0;
    }
    set shields(val) {
        if (this.a11y) this.a11y.shields = val;
    }

    get maxShields() {
        return this.a11y ? this.a11y.maxShields : 3;
    }
    set maxShields(val) {
        if (this.a11y) this.a11y.maxShields = val;
    }

    get currentGuidedChar() {
        return this.a11y ? this.a11y.currentGuidedChar : null;
    }
    set currentGuidedChar(val) {
        if (this.a11y) this.a11y.currentGuidedChar = val;
    }

    // ── 音效代理 ─────────────────────────────────────────────────────────────
    initAudio() { this.audio.init(); }
    playLaserSound() { this.audio.playLaserSound(); }
    playExplosionSound() { this.audio.playExplosionSound(); }
    playHurtSound() { this.audio.playHurtSound(); }
    playBombReadySound() { this.audio.playBombReadySound(); }
    playBombSound() { this.audio.playBombSound(); }
    playShieldBlockSound() { this.audio.playShieldBlockSound(); }

    // ── A11y 代理 ────────────────────────────────────────────────────────────
    initA11yMode() { this.a11y.init(); }
    setA11yMode(e) { this.a11y.setA11yMode(e); }
    toggleA11yMode() { this.a11y.toggleA11yMode(); }
    updateShieldUI() { this.a11y.updateShieldUI(); }
    updateKeyGuideLight() { this.a11y.updateKeyGuideLight(); }
    clearKeyGuideLight() { this.a11y.clearKeyGuideLight(); }

    // ── AI Pilot 代理 ────────────────────────────────────────────────────────
    toggleAiPilot(force) { this.pilot.toggleAiPilot(force); }
    startAiLoop() { this.pilot.startAiLoop(); }
    stopAiLoop() { this.pilot.stopAiLoop(); }
    restartAiLoop() { this.pilot.restartAiLoop(); }
    updateAiUI() { this.pilot.updateAiUI(); }
    moveAiGazeTo(key, shift) { this.pilot.moveAiGazeTo(key, shift); }
    clearGaze() { this.pilot.clearGaze(); }
    clearTargetLock() { this.pilot.clearTargetLock(); }
    aiThinkAndAct() { this.pilot.aiThinkAndAct(); }

    // ── 事件綁定 ─────────────────────────────────────────────────────────────
    bindEvents() {
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startGame());
        }

        window.addEventListener('keydown', (e) => {
            // Tab 鍵：無縫切換 AI 接管 / 玩家手動駕駛
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggleAiPilot();
                return;
            }

            // 主選單或結束畫面按 Space / Enter 開始遊戲
            if (!this.isPlaying) {
                if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                    return;
                }
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    this.startGame();
                }
                return;
            }

            // 忽略功能鍵與輸入法暫態鍵
            if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape', 'Process', 'Unidentified', 'Dead'].includes(e.key)) {
                return;
            }

            // 空白鍵：若有 EMP 核彈則引爆大招
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                if (this.bombs > 0) {
                    this.triggerEmpBomb();
                    return;
                }
            }

            this.handleKeyInput(e.key);
        });

        // 重新開始事件監聽 (從 Game Over 介面觸發)
        if (typeof document !== 'undefined' && document.body) {
            document.body.addEventListener('click', (e) => {
                if (e.target && e.target.id === 'restart-btn') {
                    this.startGame();
                }
            });
        }
    }

    // ── 遊戲流程控制 ─────────────────────────────────────────────────────────
    startGame() {
        this.isPlaying = true;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.health = 100;
        this.hits = 0;
        this.misses = 0;
        this.gameStartTime = Date.now();

        // 重設長輩無障礙三大守護寶物
        this.a11y.resetForNewGame();

        this.lastBombScoreThreshold = 0;
        this.updateBombUI();

        this.targets = [];
        if (this.targetsContainer) this.targetsContainer.innerHTML = '';
        if (this.fxLayer) this.fxLayer.innerHTML = '';

        if (this.startModal) this.startModal.classList.add('hidden');
        if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden');

        // 透過 HTMX 事件驅動機制更新介面狀態
        this.triggerHtmxUpdates();

        // 確保音訊環境運作
        this.audio.ensureRunning();

        // 啟動遊戲主循環
        this.lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        requestAnimationFrame((time) => this.gameLoop(time));

        // 啟動敵人生成計時器 (setTimeout 自排程版)
        this.restartSpawnTimer();

        // 更新 AI 狀態並在啟用時啟動 AI 決策循環
        this.updateAiUI();
        if (this.isAiPilot) {
            this.startAiLoop();
        }
    }

    restartSpawnTimer() {
        if (this.spawnTimer) clearTimeout(this.spawnTimer);
        const reduction = Math.floor(this.score / 60) * 40;
        const interval = Math.max(this.minSpawnInterval, this.spawnInterval - reduction);
        this.spawnTimer = setTimeout(() => {
            if (!this.isPlaying) return;
            this.spawnTarget();
            this.restartSpawnTimer();
        }, interval);
    }

    spawnTarget() {
        if (!this.isPlaying) return;

        const char = ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];
        let charType = 'char-lower';
        if (CHAR_SETS.upper.includes(char)) charType = 'char-upper';
        else if (CHAR_SETS.digits.includes(char)) charType = 'char-number';
        else if (CHAR_SETS.symbols.includes(char)) charType = 'char-symbol';

        const fieldWidth = this.battlefield ? this.battlefield.clientWidth : 800;
        const x = Math.random() * (fieldWidth - 100) + 50;
        const y = 30;
        const targetId = `target-${++this.targetIdCounter}`;

        const el = document.createElement('div');
        el.id = targetId;
        el.className = `target-node ${charType}`;
        const subtagHtml = SYMBOL_ANNOTATIONS[char] ? `<span class="symbol-subtag">${SYMBOL_ANNOTATIONS[char]}</span>` : '';
        el.innerHTML = `<span class="char-glyph">${char}</span>${subtagHtml}`;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        if (this.targetsContainer) {
            this.targetsContainer.appendChild(el);
        }

        const a11yFactor = this.isA11yMode ? 0.85 : 1.0;
        const speed = (this.baseSpeed + Math.min(this.score / 80, 80)) * a11yFactor;

        this.targets.push({
            id: targetId,
            char: char,
            x: x,
            y: y,
            speed: speed,
            element: el
        });

        this.updateKeyGuideLight();
    }

    gameLoop(currentTime) {
        if (!this.isPlaying) return;

        const delta = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        const fieldHeight = this.battlefield ? this.battlefield.clientHeight - 40 : 560;

        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            target.y += target.speed * delta;
            target.element.style.top = `${target.y}px`;

            if (target.y >= fieldHeight) {
                this.handleTargetBreach(target, i);
            }
        }

        this.updateKeyGuideLight();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    handleTargetBreach(target, index) {
        if (index >= 0 && index < this.targets.length) {
            this.targets.splice(index, 1);
        }
        target.element.remove();

        if (this.lockedTargetId === target.id) {
            this.clearTargetLock();
        }

        // 長輩守護寶物二：免死護盾優先吸收傷害
        if (this.isA11yMode && this.a11y.absorbBreachWithShield()) {
            this.playShieldBlockSound();
            if (this.battlefield) {
                const shieldFlash = document.createElement('div');
                shieldFlash.className = 'shield-block-flash';
                shieldFlash.textContent = '🛡️ 守護護盾格擋！HP -0';
                this.battlefield.appendChild(shieldFlash);
                setTimeout(() => shieldFlash.remove(), 400);
            }
            this.updateKeyGuideLight();
            return;
        }

        // 無護盾時扣除生命
        this.combo = 0;
        this.health = Math.max(0, this.health - 20);
        this.playHurtSound();

        if (this.battlefield) {
            this.battlefield.classList.add('damage-flash');
            setTimeout(() => {
                if (this.battlefield) this.battlefield.classList.remove('damage-flash');
            }, 300);
        }

        this.triggerHtmxUpdates();
        this.updateKeyGuideLight();

        if (this.health <= 0) {
            this.triggerGameOver();
        }
    }

    handleKeyInput(key) {
        if (!this.isPlaying) return;

        if (this.lastKeyDisplay) {
            this.lastKeyDisplay.textContent = key === ' ' ? 'SPACE' : key;
        }

        this.updateVirtualKeyboard(key);

        // 尋找符合字元中威脅最高（Y 軸最深）之目標
        let matchedIndex = -1;
        let maxY = -Infinity;

        for (let i = 0; i < this.targets.length; i++) {
            if (this.targets[i].char === key && this.targets[i].y > maxY) {
                maxY = this.targets[i].y;
                matchedIndex = i;
            }
        }

        if (matchedIndex !== -1) {
            const target = this.targets[matchedIndex];
            this.hits++;
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            const difficulty = getCharDifficulty(target.char);
            const multiplier = DIFFICULTY_MULTIPLIER[difficulty] || 1.0;
            const comboBonus = Math.floor(this.combo / 5) * 2;
            const pointsEarned = Math.round((10 + comboBonus) * multiplier);

            this.score += pointsEarned;
            this.checkBombRecharge();

            this.shootLaser(target);
            this.targets.splice(matchedIndex, 1);
            this.explodeTarget(target);

            if (this.lockedTargetId === target.id) {
                this.clearTargetLock();
            }

            this.triggerHtmxUpdates();
            this.updateKeyGuideLight();
        } else {
            this.misses++;
            this.combo = 0;
            this.triggerHtmxUpdates();
        }
    }

    shootLaser(target) {
        this.playLaserSound();

        const cannonBaseX = this.battlefield ? this.battlefield.clientWidth / 2 : 400;
        const cannonBaseY = this.battlefield ? this.battlefield.clientHeight - 30 : 570;

        const targetCenterX = target.x + 20;
        const targetCenterY = target.y + 20;

        // 計算砲台轉向角度
        const dx = targetCenterX - cannonBaseX;
        const dy = targetCenterY - cannonBaseY;
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = angleRad * (180 / Math.PI) + 90;

        if (this.cannonBarrel) {
            this.cannonBarrel.style.transform = `translateX(-50%) rotate(${angleDeg}deg)`;
        }

        // 繪製動態雷射 SVG 光束
        const svgNS = 'http://www.w3.org/2000/svg';
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', cannonBaseX);
        line.setAttribute('y1', cannonBaseY - 10);
        line.setAttribute('x2', targetCenterX);
        line.setAttribute('y2', targetCenterY);
        line.setAttribute('stroke', '#58a6ff');
        line.setAttribute('stroke-width', '4');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('filter', 'drop-shadow(0 0 8px #58a6ff)');
        line.classList.add('laser-beam');

        if (this.fxLayer) {
            this.fxLayer.appendChild(line);
            setTimeout(() => line.remove(), 120);
        }
    }

    explodeTarget(target) {
        this.playExplosionSound();
        const el = target.element;
        el.classList.add('exploding');
        setTimeout(() => el.remove(), 250);
    }

    triggerGameOver() {
        this.isPlaying = false;
        clearTimeout(this.spawnTimer);
        this.stopAiLoop();

        this.targets.forEach(t => t.element.remove());
        this.targets = [];

        const totalAttempts = this.hits + this.misses;
        const accuracy = totalAttempts > 0 ? Math.round((this.hits / totalAttempts) * 100) : 100;
        const durationS = this.gameStartTime ? Math.max(0, Math.round((Date.now() - this.gameStartTime) / 1000)) : 0;

        const currentModel = AI_MODELS[this.currentAiModelKey] || AI_MODELS.veteran;
        const defaultCallsign = this.isAiPilot ? currentModel.name : 'PILOT_01';
        const aiBadge = this.isAiPilot
            ? `<div style="margin-bottom: 14px;"><span class="badge" style="border-color: var(--accent-yellow); color: var(--accent-yellow); font-size: 0.85rem; padding: 6px 12px;">🤖 AI 自主巡航接管: ${currentModel.label}</span></div>`
            : '';

        const gameOverHTML = `
            <div class="modal modal-large">
                <h1 class="title" style="color: var(--accent-red); text-shadow: 0 0 15px rgba(248, 81, 73, 0.5);">防線失守・任務結束</h1>
                <p class="subtitle">打字防衛戰・陣地失守統計報告</p>
                
                ${aiBadge}

                <div class="instructions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div><strong style="color: var(--text-secondary)">最終得分：</strong> <span style="color: var(--accent-cyan); font-size: 1.2rem;">${this.score}</span></div>
                    <div><strong style="color: var(--text-secondary)">最高連擊：</strong> <span style="color: var(--accent-yellow); font-size: 1.2rem;">${this.maxCombo}x</span></div>
                    <div><strong style="color: var(--text-secondary)">命中目標：</strong> <span style="color: var(--accent-green);">${this.hits}</span></div>
                    <div><strong style="color: var(--text-secondary)">擊準命中率：</strong> <span>${accuracy}%</span></div>
                    <div><strong style="color: var(--text-secondary)">作戰時長：</strong> <span style="color: var(--text-primary); font-family: monospace;">${durationS}s</span></div>
                </div>

                <!-- HTMX 戰績提交表單 -->
                <div class="score-submission-box" id="submission-box">
                    <p style="font-size: 0.82rem; color: var(--text-secondary);">登錄戰績至 CYBER_NET 防衛英雄榜：</p>
                    <form id="score-form" 
                          hx-post="/api/score" 
                          hx-target="#leaderboard-result" 
                          hx-swap="innerHTML"
                          hx-on::after-request="document.getElementById('submission-box').innerHTML = '<p style=\\'color: var(--accent-green); font-weight: 700;\\'>✓ 戰績已同步登錄至 CYBER_NET 資料庫</p>';"
                          class="score-form-inline">
                        <input type="hidden" name="score" value="${this.score}">
                        <input type="hidden" name="maxCombo" value="${this.maxCombo}">
                        <input type="hidden" name="accuracy" value="${accuracy}">
                        <input type="hidden" name="duration_s" value="${durationS}">
                        <input type="text" name="name" class="callsign-input" value="${defaultCallsign}" placeholder="駕駛員呼號 (限16字)" maxlength="20" required autofocus autocomplete="off">
                        <button type="submit" class="submit-record-btn">
                            登錄英雄榜
                        </button>
                    </form>
                </div>

                <!-- HTMX 動態置換排行榜區域 -->
                <div id="leaderboard-result" hx-get="/api/leaderboard" hx-trigger="load" hx-swap="innerHTML">
                    <div class="leaderboard-loading">📡 連線至 CYBER_NET 載入最新英雄榜...</div>
                </div>

                <div style="margin-top: 20px;">
                    <button id="restart-btn" class="glow-button">🔄 再次挑戰 [空白鍵 / Enter]</button>
                </div>
            </div>
        `;

        if (this.gameOverOverlay) {
            this.gameOverOverlay.innerHTML = gameOverHTML;
            this.gameOverOverlay.classList.remove('hidden');
        }

        if (typeof window !== 'undefined' && window.htmx && this.gameOverOverlay) {
            window.htmx.process(this.gameOverOverlay);
        }

        const statusEl = document.getElementById('status-display');
        if (statusEl) {
            statusEl.className = 'hud-value status-over';
            statusEl.textContent = '失守';
        }
        if (typeof window !== 'undefined' && window.htmx && typeof document !== 'undefined') {
            window.htmx.trigger(document.body, 'statusUpdated');
        }
    }

    // ── EMP 核彈大招系統 ─────────────────────────────────────────────────────
    checkBombRecharge() {
        const earnedThreshold = Math.floor(this.score / this.bombScoreMilestone) * this.bombScoreMilestone;
        if (earnedThreshold > this.lastBombScoreThreshold) {
            const added = Math.floor((earnedThreshold - this.lastBombScoreThreshold) / this.bombScoreMilestone);
            this.lastBombScoreThreshold = earnedThreshold;
            if (this.bombs < this.maxBombs) {
                this.bombs = Math.min(this.maxBombs, this.bombs + added);
                this.playBombReadySound();
                this.updateBombUI(true);
            }
        }
    }

    triggerEmpBomb() {
        if (this.bombs <= 0) return;
        this.bombs--;
        this.updateBombUI();
        this.playBombSound();

        if (this.battlefield) {
            this.battlefield.classList.add('emp-flash');
            setTimeout(() => {
                if (this.battlefield) this.battlefield.classList.remove('emp-flash');
            }, 600);

            const shockwave = document.createElement('div');
            shockwave.className = 'emp-shockwave';
            this.battlefield.appendChild(shockwave);
            setTimeout(() => shockwave.remove(), 700);
        }

        const clearedCount = this.targets.length;
        const targetsToClear = [...this.targets];
        this.targets = [];

        targetsToClear.forEach(t => {
            this.shootLaser(t);
            this.explodeTarget(t);
        });

        this.score += clearedCount * 15;
        this.clearTargetLock();
        this.triggerHtmxUpdates();
        this.updateKeyGuideLight();
    }

    updateBombUI(animate = false) {
        if (this.bombSlot1) {
            this.bombSlot1.className = this.bombs >= 1 ? 'bomb-slot ready' : 'bomb-slot empty';
        }
        if (this.bombSlot2) {
            this.bombSlot2.className = this.bombs >= 2 ? 'bomb-slot ready' : 'bomb-slot empty';
        }
        if (this.bombSlot3) {
            if (this.maxBombs >= 3) {
                this.bombSlot3.style.display = 'inline-flex';
                this.bombSlot3.className = this.bombs >= 3 ? 'bomb-slot ready' : 'bomb-slot empty';
            } else {
                this.bombSlot3.style.display = 'none';
            }
        }
        if (this.bombHint) {
            this.bombHint.style.display = this.bombs > 0 ? 'inline-block' : 'none';
        }

        if (this.spaceKeyElement) {
            if (this.bombs > 0) {
                this.spaceKeyElement.classList.add('vkey-space-bomb-ready');
                const mainSpan = this.spaceKeyElement.querySelector('.vkey-main');
                if (mainSpan) {
                    mainSpan.textContent = `⚡ EMP 核彈已就緒 [空白鍵] (x${this.bombs})`;
                }
            } else {
                this.spaceKeyElement.classList.remove('vkey-space-bomb-ready');
                const mainSpan = this.spaceKeyElement.querySelector('.vkey-main');
                if (mainSpan) {
                    mainSpan.textContent = '空白鍵 SPACE [AI 神經掃描]';
                }
            }
        }
    }

    // ── 虛擬鍵盤構建與動畫 ───────────────────────────────────────────────────
    buildVirtualKeyboard() {
        if (!this.virtualKeyboard) return;
        this.virtualKeyboard.innerHTML = '';
        this.charToKeyMap.clear();
        this.shiftKeyElements = [];

        KEYBOARD_LAYOUT.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'vkey-row';

            row.forEach(item => {
                const keyEl = document.createElement('div');
                keyEl.className = `vkey ${item.width ? 'vkey-' + item.width : ''}`;

                if (item.isShift) {
                    this.shiftKeyElements.push(keyEl);
                }
                if (item.key === ' ') {
                    this.spaceKeyElement = keyEl;
                }

                if (item.shift) {
                    keyEl.innerHTML = `<span class="vkey-sub">${item.shift}</span><span class="vkey-main">${item.key}</span>`;
                } else {
                    keyEl.innerHTML = `<span class="vkey-main">${item.label || item.key}</span>`;
                }

                if (item.key) {
                    this.charToKeyMap.set(item.key, { element: keyEl, isShift: false });
                }
                if (item.shift) {
                    this.charToKeyMap.set(item.shift, { element: keyEl, isShift: true });
                }

                rowEl.appendChild(keyEl);
            });

            this.virtualKeyboard.appendChild(rowEl);
        });
    }

    updateVirtualKeyboard(keyChar) {
        const entry = this.charToKeyMap.get(keyChar);
        if (!entry) return;

        entry.element.classList.add('vkey-active');
        if (entry.isShift) {
            this.shiftKeyElements.forEach(el => el.classList.add('vkey-active-shift'));
        }

        setTimeout(() => {
            entry.element.classList.remove('vkey-active');
            if (entry.isShift) {
                this.shiftKeyElements.forEach(el => el.classList.remove('vkey-active-shift'));
            }
        }, 120);
    }

    // ── HTMX HUD 更新 ────────────────────────────────────────────────────────
    triggerHtmxUpdates() {
        const scoreEl = document.getElementById('score-display');
        const comboEl = document.getElementById('combo-display');
        const healthEl = document.getElementById('health-bar');
        const statusEl = document.getElementById('status-display');
        const healthFill = document.querySelector('.health-fill');

        if (scoreEl) scoreEl.textContent = this.score;
        if (comboEl) comboEl.textContent = `${this.combo}x`;
        if (healthEl) healthEl.textContent = `${this.health}%`;
        if (healthFill) healthFill.style.width = `${this.health}%`;

        if (statusEl) {
            if (this.health <= 0) {
                statusEl.className = 'hud-value status-over';
                statusEl.textContent = '失守';
            } else if (this.combo >= 10) {
                statusEl.className = 'hud-value status-critical';
                statusEl.textContent = '超限運作';
            } else {
                statusEl.className = 'hud-value status-active';
                statusEl.textContent = '作戰中';
            }
        }

        if (typeof window !== 'undefined' && window.htmx && typeof document !== 'undefined') {
            window.htmx.trigger(document.body, 'statusUpdated');
        }
    }

    setupScreenshotScene() {
        this.startGame();
        this.score = 2480;
        this.combo = 18;
        this.maxCombo = 24;
        this.health = 90;
        this.bombs = 2;
        this.updateBombUI();
        this.triggerHtmxUpdates();

        this.targets.forEach(t => t.element.remove());
        this.targets = [];

        const sampleChars = ['C', 'Y', 'B', 'E', 'R', '#', '!', '9', 'x', '$'];
        const samplePositions = [
            { x: 90,  y: 80,  speed: 48 },
            { x: 180, y: 190, speed: 52 },
            { x: 270, y: 310, speed: 60 },
            { x: 380, y: 140, speed: 45 },
            { x: 470, y: 250, speed: 55 },
            { x: 560, y: 370, speed: 65 },
            { x: 650, y: 110, speed: 50 },
            { x: 740, y: 220, speed: 58 },
            { x: 320, y: 440, speed: 70 },
            { x: 510, y: 160, speed: 46 }
        ];

        samplePositions.forEach((pos, idx) => {
            const char = sampleChars[idx % sampleChars.length];
            const targetId = `demo-target-${idx}`;
            let charType = 'char-lower';
            if (CHAR_SETS.upper.includes(char)) charType = 'char-upper';
            else if (CHAR_SETS.digits.includes(char)) charType = 'char-number';
            else if (CHAR_SETS.symbols.includes(char)) charType = 'char-symbol';

            const el = document.createElement('div');
            el.id = targetId;
            el.className = `target-node ${charType}`;
            const subtag = SYMBOL_ANNOTATIONS[char] ? `<span class="symbol-subtag">${SYMBOL_ANNOTATIONS[char]}</span>` : '';
            el.innerHTML = `<span class="char-glyph">${char}</span>${subtag}`;
            el.style.left = `${pos.x}px`;
            el.style.top = `${pos.y}px`;

            if (this.targetsContainer) this.targetsContainer.appendChild(el);
            this.targets.push({ id: targetId, char, x: pos.x, y: pos.y, speed: pos.speed, element: el });
        });

        this.toggleAiPilot(true);
        this.currentAiModelKey = 'veteran';
        this.pilot.currentAiModelKey = 'veteran';
        this.updateAiUI();

        const primaryTarget = this.targets[8];
        if (primaryTarget) {
            this.shootLaser(primaryTarget);
            this.pilot.moveAiGazeTo(primaryTarget.char, false);
            if (this.pilot.aiDecisionDisplay) {
                this.pilot.aiDecisionDisplay.textContent = `鎖定目標 [${primaryTarget.char}] 墜落倒數: 1.4秒`;
            }
        }
    }
}

    const exportsObj = { TypingGame };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exportsObj;
    }
    if (typeof window !== 'undefined') {
        window.TypingGameEngine = exportsObj;
        window.TypingGame = TypingGame;
    }
})();


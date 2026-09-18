// ==========================================
// TYPING SHOOTER - GAME ENGINE WITH HTMX INTEGRATION
// ==========================================

// 支援的所有字元集合：a-z, A-Z, 0-9, 以及所有標準與特殊符號
const CHAR_SETS = {
    lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    digits: '0123456789'.split(''),
    symbols: [
        '!', '@', '#', '$', '%', '^', '&', '*', '(', ')',
        '-', '_', '=', '+', '[', ']', '{', '}', ';', ':',
        "'", '"', ',', '.', '/', '?', '\\', '|', '<', '>', '~', '`'
    ]
};

// 扁平化字元清單以便隨機挑選
const ALL_CHARS = [
    ...CHAR_SETS.lower,
    ...CHAR_SETS.upper,
    ...CHAR_SETS.digits,
    ...CHAR_SETS.symbols
];

// 難辨符號長輩與無障礙中文易辨標籤對照表
const SYMBOL_ANNOTATIONS = {
    '.': '句點',
    ',': '逗號',
    ':': '冒號',
    ';': '分號',
    "'": '單引',
    '"': '雙引',
    '`': '反引',
    '~': '波浪',
    '!': '驚嘆',
    '?': '問號',
    '-': '減號',
    '_': '底線',
    '=': '等於',
    '+': '加號',
    '[': '中括',
    ']': '中括',
    '{': '大括',
    '}': '大括',
    '/': '斜線',
    '\\': '反斜',
    '|': '豎線',
    '@': '老鼠',
    '#': '井字',
    '$': '金錢',
    '%': '百分',
    '^': '次方',
    '&': 'AND',
    '*': '星號'
};

// ==========================================
// AI 模型設定（不同級別的反應速度、準確率與思考頻率）
// ==========================================
const AI_MODELS = {
    rookie: {
        name: 'AI_ROOKIE_V1',
        label: '🟢 ROOKIE BOT',
        minDelay: 220,
        maxDelay: 320,
        accuracy: 0.88, // 偶爾手滑誤擊
        scanInterval: 140
    },
    veteran: {
        name: 'AI_CYBER_PRO',
        label: '🟡 CYBER PRO',
        minDelay: 90,
        maxDelay: 150,
        accuracy: 0.98,
        scanInterval: 70
    },
    god: {
        name: 'AI_AGI_OVERLORD',
        label: '🔴 AGI GOD',
        minDelay: 30,
        maxDelay: 55,
        accuracy: 1.0,
        scanInterval: 35
    }
};

// ==========================================
// 終端機虛擬鍵盤佈局（對映全字元、符號與 Shift 組合鍵）
// ==========================================
const KEYBOARD_LAYOUT = [
    [
        { key: '`', shift: '~' }, { key: '1', shift: '!' }, { key: '2', shift: '@' },
        { key: '3', shift: '#' }, { key: '4', shift: '$' }, { key: '5', shift: '%' },
        { key: '6', shift: '^' }, { key: '7', shift: '&' }, { key: '8', shift: '*' },
        { key: '9', shift: '(' }, { key: '0', shift: ')' }, { key: '-', shift: '_' },
        { key: '=', shift: '+' }, { key: 'Backspace', label: 'DEL', width: 'wide' }
    ],
    [
        { key: 'Tab', label: 'TAB', width: 'wide' },
        { key: 'q', shift: 'Q' }, { key: 'w', shift: 'W' }, { key: 'e', shift: 'E' },
        { key: 'r', shift: 'R' }, { key: 't', shift: 'T' }, { key: 'y', shift: 'Y' },
        { key: 'u', shift: 'U' }, { key: 'i', shift: 'I' }, { key: 'o', shift: 'O' },
        { key: 'p', shift: 'P' }, { key: '[', shift: '{' }, { key: ']', shift: '}' },
        { key: '\\', shift: '|', width: 'wide' }
    ],
    [
        { key: 'CapsLock', label: 'CAPS', width: 'wider' },
        { key: 'a', shift: 'A' }, { key: 's', shift: 'S' }, { key: 'd', shift: 'D' },
        { key: 'f', shift: 'F' }, { key: 'g', shift: 'G' }, { key: 'h', shift: 'H' },
        { key: 'j', shift: 'J' }, { key: 'k', shift: 'K' }, { key: 'l', shift: 'L' },
        { key: ';', shift: ':' }, { key: "'", shift: '"' },
        { key: 'Enter', label: 'ENTER', width: 'wider' }
    ],
    [
        { key: 'ShiftLeft', label: 'SHIFT', width: 'widest', isShift: true },
        { key: 'z', shift: 'Z' }, { key: 'x', shift: 'X' }, { key: 'c', shift: 'C' },
        { key: 'v', shift: 'V' }, { key: 'b', shift: 'B' }, { key: 'n', shift: 'N' },
        { key: 'm', shift: 'M' }, { key: ',', shift: '<' }, { key: '.', shift: '>' },
        { key: '/', shift: '?' },
        { key: 'ShiftRight', label: 'SHIFT', width: 'widest', isShift: true }
    ],
    [
        { key: 'Control', label: 'CTRL', width: 'wide' },
        { key: 'Alt', label: 'OPT' },
        { key: 'Meta', label: 'CMD' },
        { key: ' ', label: 'SPACE [AI NEURAL SCANNER]', width: 'space' },
        { key: 'Meta', label: 'CMD' },
        { key: 'Alt', label: 'OPT' },
        { key: 'ai-eye', label: '👁️ AI EYE', width: 'wide' }
    ]
];

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
        this.aiToggleBtn = document.getElementById('ai-toggle-btn');
        this.aiStatusLabel = document.getElementById('ai-status-label');
        this.aiModelSelect = document.getElementById('ai-model-select');
        this.aiLaunchBtn = document.getElementById('ai-launch-btn');
        this.aiDecisionDisplay = document.getElementById('ai-decision-display');
        this.virtualKeyboard = document.getElementById('virtual-keyboard');
        this.aiGazeReticle = document.getElementById('ai-gaze-reticle');
        this.bombSlot1 = document.getElementById('bomb-slot-1');
        this.bombSlot2 = document.getElementById('bomb-slot-2');
        this.bombHint = document.getElementById('bomb-hint');
        this.a11yToggleBtn = document.getElementById('a11y-toggle-btn');
        this.a11yStatusLabel = document.getElementById('a11y-status-label');
        this.modalA11yBtn = document.getElementById('modal-a11y-toggle-btn');
        this.modalA11yLabel = document.getElementById('modal-a11y-label');
        this.spaceKeyElement = null;

        // 武器與 EMP 核彈大招系統 (每 60 分充能 1 發，最多 2 發)
        this.bombs = 0;
        this.maxBombs = 2;
        this.bombScoreMilestone = 60;
        this.lastBombScoreThreshold = 0;

        // 長輩與無障礙大字模式
        this.isA11yMode = false;

        // 建立虛擬鍵盤與字元快取對映表
        this.charToKeyMap = new Map();
        this.shiftKeyElements = [];
        this.buildVirtualKeyboard();
        this.updateBombUI();
        this.initA11yMode();

        // AI 駕駛狀態
        this.isAiPilot = false;
        this.currentAiModelKey = 'veteran';
        this.aiTimer = null;
        this.aiIsExecuting = false;
        this.lockedTargetId = null;

        // 音效引擎（使用 Web Audio API，無外部資源依賴）
        this.initAudio();

        // 遊戲狀態
        this.isPlaying = false;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.health = 100;
        this.maxHealth = 100;
        this.hits = 0;
        this.misses = 0;

        // 實體管理
        this.targets = []; // 存儲目前在場上的敵人
        this.targetIdCounter = 0;
        this.spawnTimer = null;
        this.lastTime = 0;
        this.baseSpeed = 45; // 像素/秒
        this.spawnInterval = 1400; // 毫秒

        this.bindEvents();
    }

    initAudio() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioCtx();
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    playLaserSound() {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.12);
    }

    playExplosionSound() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.audioCtx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.2);
    }

    playHurtSound() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, this.audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.audioCtx.currentTime + 0.18);

        gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.18);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.18);
    }

    playBombReadySound() {
        if (!this.audioCtx) return;
        try {
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(660, now + 0.08);
            osc.frequency.setValueAtTime(880, now + 0.16);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.28);
        } catch (e) {}
    }

    playBombSound() {
        if (!this.audioCtx) return;
        try {
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 0.6);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.65);

            const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.35);
            const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.audioCtx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = this.audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0.25, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            noise.connect(noiseGain);
            noiseGain.connect(this.audioCtx.destination);
            noise.start(now);
        } catch (e) {}
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startGame());

        // AI 副駕駛專屬按鈕與下拉選單監聽
        if (this.aiToggleBtn) {
            this.aiToggleBtn.addEventListener('click', () => this.toggleAiPilot());
        }
        if (this.aiModelSelect) {
            this.aiModelSelect.addEventListener('change', (e) => {
                this.currentAiModelKey = e.target.value;
                if (this.isAiPilot && this.isPlaying) {
                    this.restartAiLoop();
                }
            });
        }
        if (this.aiLaunchBtn) {
            this.aiLaunchBtn.addEventListener('click', () => {
                this.toggleAiPilot(true);
                this.startGame();
            });
        }

        // 長輩與無障礙大字切換監聽
        if (this.a11yToggleBtn) {
            this.a11yToggleBtn.addEventListener('click', () => this.toggleA11yMode());
        }
        if (this.modalA11yBtn) {
            this.modalA11yBtn.addEventListener('click', () => this.toggleA11yMode());
        }

        window.addEventListener('keydown', (e) => {
            // Tab 鍵：無縫切換 AI 接管 / 玩家手動駕駛
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggleAiPilot();
                return;
            }

            // 如果在主選單或結束畫面，按下 Space 或 Enter 開始遊戲
            if (!this.isPlaying) {
                // 若當前焦點在輸入框（例如輸入暱稱呼號），不攔截，讓 Enter 正常提交表單
                if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                    return;
                }
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    this.startGame();
                }
                return;
            }

            // 忽略功能鍵與輸入法暫態鍵 (Shift, Alt, Ctrl, Meta, IME Process 等)
            if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape', 'Process', 'Unidentified', 'Dead'].includes(e.key)) {
                return;
            }

            // 阻止如空白鍵頁面滾動等預設行為，若有 EMP 核彈則啟動大招
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                if (this.bombs > 0) {
                    this.triggerEmpBomb();
                    return;
                }
            }

            this.handleKeyInput(e.key);
        });

        // 重新開始事件監聽 (從 Game Over 介面的 HTMX/DOM 觸發)
        document.body.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'restart-btn') {
                this.startGame();
            }
        });
    }

    startGame() {
        this.isPlaying = true;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.health = 100;
        this.hits = 0;
        this.misses = 0;
        this.bombs = 0;
        this.lastBombScoreThreshold = 0;
        this.updateBombUI();
        this.targets = [];
        this.targetsContainer.innerHTML = '';
        this.fxLayer.innerHTML = '';

        this.startModal.classList.add('hidden');
        this.gameOverOverlay.classList.add('hidden');

        // 透過 HTMX 事件驅動機制更新介面狀態
        this.triggerHtmxUpdates();

        // 啟動音訊 context
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        // 啟動遊戲主循環
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));

        // 啟動敵人生成計時器
        if (this.spawnTimer) clearInterval(this.spawnTimer);
        this.spawnTimer = setInterval(() => this.spawnTarget(), this.spawnInterval);

        // 更新 AI 介面狀態並在啟用時啟動 AI 決策循環
        this.updateAiUI();
        if (this.isAiPilot) {
            this.startAiLoop();
        }
    }

    spawnTarget() {
        if (!this.isPlaying) return;

        // 隨機抽選一個字元
        const char = ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];
        
        // 判斷字元種類
        let charType = 'char-lower';
        if (CHAR_SETS.upper.includes(char)) charType = 'char-upper';
        else if (CHAR_SETS.digits.includes(char)) charType = 'char-number';
        else if (CHAR_SETS.symbols.includes(char)) charType = 'char-symbol';

        // 計算初始位置 (避開邊界左右各 40px)
        const fieldWidth = this.battlefield.clientWidth;
        const x = Math.random() * (fieldWidth - 100) + 50;
        const y = 30;

        const targetId = `target-${++this.targetIdCounter}`;

        // 建立 DOM 節點
        const el = document.createElement('div');
        el.id = targetId;
        el.className = `target-node ${charType}`;
        const subtagHtml = SYMBOL_ANNOTATIONS[char] ? `<span class="symbol-subtag">${SYMBOL_ANNOTATIONS[char]}</span>` : '';
        el.innerHTML = `<span class="char-glyph">${char}</span>${subtagHtml}`;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        this.targetsContainer.appendChild(el);

        // 速度隨得分遞增（無障礙模式下提供 15% 溫和微調，體貼長輩動態視力反應時間）
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
    }

    gameLoop(currentTime) {
        if (!this.isPlaying) return;

        const delta = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        const fieldHeight = this.battlefield.clientHeight - 40;

        // 更新所有目標位置
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            target.y += target.speed * delta;
            target.element.style.top = `${target.y}px`;

            // 判斷目標是否到達底部防禦線
            if (target.y >= fieldHeight) {
                this.handleTargetBreach(target, i);
            }
        }

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    handleKeyInput(pressedKey) {
        // 更新底部輸入按鍵 HUD
        this.lastKeyDisplay.textContent = pressedKey === ' ' ? 'SPACE' : pressedKey;

        // 虛擬鍵盤敲擊視覺回饋
        this.visualPressKey(pressedKey);

        // 尋找符合字元的目標（優先打擊最靠近底部防禦線的目標）
        let targetIndex = -1;
        let maxY = -1;

        for (let i = 0; i < this.targets.length; i++) {
            if (this.targets[i].char === pressedKey) {
                if (this.targets[i].y > maxY) {
                    maxY = this.targets[i].y;
                    targetIndex = i;
                }
            }
        }

        if (targetIndex !== -1) {
            // 命中成功！
            const target = this.targets[targetIndex];
            this.shootTarget(target, targetIndex);
        } else {
            // 盲打落空，連擊中斷
            this.combo = 0;
            this.misses++;
            this.triggerHtmxComboUpdate();
        }
    }

    shootTarget(target, index) {
        this.hits++;
        this.combo++;
        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }

        // 分數計算：基礎 10 分 + 連擊加成
        const gainedScore = 10 + Math.floor(this.combo * 2.5);
        this.score += gainedScore;

        // 檢查 EMP 核彈充能
        this.checkBombRecharge();

        // 砲台旋轉轉向目標
        this.aimCannonAt(target.x, target.y);

        // 播放雷射動畫與射擊音效
        this.drawLaserBeam(target.x, target.y);
        this.playLaserSound();

        // 爆炸特效
        this.explodeTarget(target);

        // 從陣列移除
        this.targets.splice(index, 1);

        // HTMX 狀態通知
        this.triggerHtmxScoreUpdate();
        this.triggerHtmxComboUpdate();
    }

    handleTargetBreach(target, index) {
        // 目標觸底造成防線受損
        target.element.remove();
        this.targets.splice(index, 1);

        this.combo = 0;
        this.health = Math.max(0, this.health - 20); // 每次漏掉扣 20 HP
        this.playHurtSound();

        this.triggerHtmxComboUpdate();
        this.triggerHtmxHealthUpdate();

        // 畫面受損震動紅光閃爍
        if (this.battlefield) {
            this.battlefield.style.boxShadow = 'inset 0 0 40px rgba(248, 81, 73, 0.6)';
            setTimeout(() => {
                if (this.battlefield) this.battlefield.style.boxShadow = 'none';
            }, 180);
        }

        if (this.health <= 0) {
            this.triggerGameOver();
        }
    }

    aimCannonAt(targetX, targetY) {
        if (!this.cannon || !this.cannonBarrel) return;
        const cannonRect = this.cannon.getBoundingClientRect();
        const fieldRect = this.battlefield.getBoundingClientRect();

        const cannonCenterX = cannonRect.left - fieldRect.left + cannonRect.width / 2;
        const cannonCenterY = cannonRect.top - fieldRect.top + cannonRect.height / 2;

        const deltaX = targetX - cannonCenterX;
        const deltaY = targetY - cannonCenterY;
        const angleRad = Math.atan2(deltaY, deltaX);
        const angleDeg = (angleRad * 180) / Math.PI + 90; // 以垂直向上為基準

        this.cannonBarrel.style.transform = `rotate(${angleDeg}deg)`;
    }

    drawLaserBeam(targetX, targetY, color = '#58a6ff', width = 3) {
        const cannonRect = this.cannon.getBoundingClientRect();
        const fieldRect = this.battlefield.getBoundingClientRect();

        const startX = cannonRect.left - fieldRect.left + cannonRect.width / 2;
        const startY = cannonRect.top - fieldRect.top;

        // 在 SVG 特效層上繪製雷射線段
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', targetX);
        line.setAttribute('y2', targetY);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', width);
        line.setAttribute('filter', `drop-shadow(0 0 8px ${color})`);

        this.fxLayer.appendChild(line);

        // 0.12 秒後淡出消失
        setTimeout(() => {
            line.remove();
        }, 120);
    }

    explodeTarget(target) {
        const el = target.element;
        el.classList.add('target-exploding');
        this.playExplosionSound();

        setTimeout(() => {
            el.remove();
        }, 250);
    }

    triggerGameOver() {
        this.isPlaying = false;
        clearInterval(this.spawnTimer);
        this.stopAiLoop();

        // 清空場上物件
        this.targets.forEach(t => t.element.remove());
        this.targets = [];

        // 計算擊準率
        const totalAttempts = this.hits + this.misses;
        const accuracy = totalAttempts > 0 ? Math.round((this.hits / totalAttempts) * 100) : 100;

        const currentModel = AI_MODELS[this.currentAiModelKey] || AI_MODELS.veteran;
        const defaultCallsign = this.isAiPilot ? currentModel.name : 'PILOT_01';
        const aiBadge = this.isAiPilot
            ? `<div style="margin-bottom: 14px;"><span class="badge" style="border-color: var(--accent-yellow); color: var(--accent-yellow); font-size: 0.85rem; padding: 6px 12px;">🤖 AI AUTONOMOUS RUN: ${currentModel.label}</span></div>`
            : '';

        // 透過 HTMX 自定義事件將 HTML 替換到 gameover-overlay
        const gameOverHTML = `
            <div class="modal modal-large">
                <h1 class="title" style="color: var(--accent-red); text-shadow: 0 0 15px rgba(248, 81, 73, 0.5);">DEFENSE BREACHED</h1>
                <p class="subtitle">防衛線失守・任務終止</p>
                
                ${aiBadge}

                <div class="instructions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div><strong style="color: var(--text-secondary)">FINAL SCORE:</strong> <span style="color: var(--accent-cyan); font-size: 1.2rem;">${this.score}</span></div>
                    <div><strong style="color: var(--text-secondary)">MAX COMBO:</strong> <span style="color: var(--accent-yellow); font-size: 1.2rem;">${this.maxCombo}x</span></div>
                    <div><strong style="color: var(--text-secondary)">TARGETS HIT:</strong> <span style="color: var(--accent-green);">${this.hits}</span></div>
                    <div><strong style="color: var(--text-secondary)">ACCURACY:</strong> <span>${accuracy}%</span></div>
                </div>

                <!-- HTMX 戰績提交表單 -->
                <div class="score-submission-box" id="submission-box">
                    <p style="font-size: 0.82rem; color: var(--text-secondary);">登錄戰績至 CYBER_NET 防衛排行榜：</p>
                    <form id="score-form" 
                          hx-post="/api/score" 
                          hx-target="#leaderboard-result" 
                          hx-swap="innerHTML"
                          hx-on::after-request="document.getElementById('submission-box').innerHTML = '<p style=\\'color: var(--accent-green); font-weight: 700;\\'>✓ 戰績已同步登錄至 CYBER_NET 資料庫</p>';"
                          class="score-form-inline">
                        <input type="hidden" name="score" value="${this.score}">
                        <input type="hidden" name="maxCombo" value="${this.maxCombo}">
                        <input type="hidden" name="accuracy" value="${accuracy}">
                        <input type="text" name="name" class="callsign-input" value="${defaultCallsign}" placeholder="YOUR CALLSIGN" maxlength="20" required autofocus autocomplete="off">
                        <button type="submit" class="submit-record-btn">
                            TRANSMIT RECORD
                        </button>
                    </form>
                </div>

                <!-- HTMX 動態置換排行榜區域 (初次加載由 HTMX GET /api/leaderboard 載入) -->
                <div id="leaderboard-result" hx-get="/api/leaderboard" hx-trigger="load" hx-swap="innerHTML">
                    <div class="leaderboard-loading">📡 連線至 CYBER_NET 載入最新戰績榜...</div>
                </div>

                <div style="margin-top: 20px;">
                    <button id="restart-btn" class="glow-button">RETRY MISSION [SPACE / ENTER]</button>
                </div>
            </div>
        `;

        this.gameOverOverlay.innerHTML = gameOverHTML;
        this.gameOverOverlay.classList.remove('hidden');

        // 關鍵：動態插入帶有 hx-* 屬性的 DOM 後，呼叫 htmx.process 進行事件綁定
        if (window.htmx) {
            htmx.process(this.gameOverOverlay);
        }

        // 發送 HTMX 狀態事件
        const statusEl = document.getElementById('status-display');
        statusEl.className = 'hud-value status-over';
        statusEl.textContent = 'COMPROMISED';
        htmx.trigger(document.body, 'statusUpdated');
    }

    // ==========================================
    // EMP 全域核彈大招系統 (EMP ULTIMATE BOMB)
    // ==========================================
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

    updateBombUI(animate = false) {
        if (this.bombSlot1) {
            this.bombSlot1.className = this.bombs >= 1 ? 'bomb-slot ready' : 'bomb-slot empty';
        }
        if (this.bombSlot2) {
            this.bombSlot2.className = this.bombs >= 2 ? 'bomb-slot ready' : 'bomb-slot empty';
        }
        if (this.bombHint) {
            this.bombHint.style.display = this.bombs > 0 ? 'inline-block' : 'none';
        }

        // 虛擬鍵盤 Space 鍵外觀狀態連動
        if (this.spaceKeyElement) {
            if (this.bombs > 0) {
                this.spaceKeyElement.classList.add('vkey-space-bomb-ready');
                const mainSpan = this.spaceKeyElement.querySelector('.vkey-main');
                if (mainSpan) {
                    mainSpan.textContent = `⚡ EMP BLAST READY [SPACE] (x${this.bombs})`;
                }
            } else {
                this.spaceKeyElement.classList.remove('vkey-space-bomb-ready');
                const mainSpan = this.spaceKeyElement.querySelector('.vkey-main');
                if (mainSpan) {
                    mainSpan.textContent = 'SPACE [AI NEURAL SCANNER]';
                }
            }
        }
    }

    triggerEmpBomb() {
        if (this.bombs <= 0 || !this.isPlaying) return;

        this.bombs--;
        this.updateBombUI();
        this.playBombSound();

        // 虛擬鍵盤 Space 鍵按下動效
        this.visualPressKey(' ');

        // 震波全屏特效
        this.createEmpShockwave();

        // 砲台全目標雷射連鎖爆破
        if (this.targets && this.targets.length > 0) {
            const targetsToDestroy = [...this.targets];
            this.targets = [];

            // 立即給予目標消滅獎勵分數
            this.score += targetsToDestroy.length * 15;
            this.hits += targetsToDestroy.length;
            this.triggerHtmxScoreUpdate();

            targetsToDestroy.forEach((target, idx) => {
                setTimeout(() => {
                    this.drawLaserBeam(target.x, target.y, '#f85149', 4);
                    this.explodeTarget(target);
                }, idx * 25);
            });

            if (this.cannonBarrel) {
                this.cannonBarrel.style.transform = 'rotate(0deg)';
            }
        }

        if (this.aiDecisionDisplay) {
            const oldText = this.aiDecisionDisplay.textContent;
            this.aiDecisionDisplay.textContent = '⚡ EMP SHOCKWAVE DETONATED!';
            this.aiDecisionDisplay.style.color = 'var(--accent-red)';
            setTimeout(() => {
                if (this.aiDecisionDisplay) {
                    this.aiDecisionDisplay.style.color = '';
                    if (this.aiDecisionDisplay.textContent.includes('DETONATED')) {
                        this.aiDecisionDisplay.textContent = oldText;
                    }
                }
            }, 1200);
        }
    }

    createEmpShockwave() {
        if (!this.cannon || !this.battlefield || !this.fxLayer) return;
        const cannonRect = this.cannon.getBoundingClientRect();
        const fieldRect = this.battlefield.getBoundingClientRect();
        const originX = cannonRect.left - fieldRect.left + cannonRect.width / 2;
        const originY = cannonRect.top - fieldRect.top;

        // SVG 衝擊環
        const wave = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        wave.setAttribute('cx', originX);
        wave.setAttribute('cy', originY);
        wave.setAttribute('r', '10');
        wave.setAttribute('class', 'emp-shockwave-ring');
        this.fxLayer.appendChild(wave);

        // 全螢幕電磁閃光
        const flash = document.createElement('div');
        flash.className = 'emp-screen-flash';
        this.battlefield.appendChild(flash);

        setTimeout(() => {
            wave.remove();
            flash.remove();
        }, 600);
    }

    // ==========================================
    // HTMX 事件與 DOM 橋接 (發送給 hx-trigger 監聽器)
    // ==========================================
    triggerHtmxUpdates() {
        this.triggerHtmxScoreUpdate();
        this.triggerHtmxComboUpdate();
        this.triggerHtmxHealthUpdate();

        const statusEl = document.getElementById('status-display');
        statusEl.className = 'hud-value status-active';
        statusEl.textContent = 'DEFENDING';
        htmx.trigger(document.body, 'statusUpdated');
    }

    triggerHtmxScoreUpdate() {
        const scoreEl = document.getElementById('score-display');
        scoreEl.textContent = this.score;
        htmx.trigger(document.body, 'scoreUpdated');
    }

    triggerHtmxComboUpdate() {
        const comboEl = document.getElementById('combo-display');
        comboEl.textContent = `${this.combo}x`;
        if (this.combo >= 5) {
            comboEl.style.color = 'var(--accent-yellow)';
        } else {
            comboEl.style.color = 'var(--accent-cyan)';
        }
        htmx.trigger(document.body, 'comboUpdated');
    }

    triggerHtmxHealthUpdate() {
        const healthBarContainer = document.getElementById('health-bar-container');
        const isLow = this.health <= 20;
        // 替換 HTMX outerHTML
        healthBarContainer.innerHTML = `
            <div id="health-bar" hx-trigger="healthUpdated from:body" hx-swap="outerHTML">
                <div class="health-fill ${isLow ? 'health-low' : ''}" style="width: ${this.health}%;"></div>
            </div>
        `;
        htmx.trigger(document.body, 'healthUpdated');
    }

    // ==========================================
    // AI 副駕駛（AUTONOMOUS AI PILOT ENGINE）
    // ==========================================
    toggleAiPilot(forceState = null) {
        this.isAiPilot = forceState !== null ? forceState : !this.isAiPilot;
        this.updateAiUI();

        if (this.isPlaying) {
            if (this.isAiPilot) {
                this.startAiLoop();
            } else {
                this.stopAiLoop();
            }
        }
    }

    updateAiUI() {
        if (!this.aiToggleBtn || !this.aiStatusLabel) return;
        if (this.isAiPilot) {
            this.aiToggleBtn.classList.add('active');
            this.aiStatusLabel.textContent = 'ONLINE';
            if (this.aiDecisionDisplay) {
                this.aiDecisionDisplay.textContent = 'RADAR ENGAGED';
            }
        } else {
            this.aiToggleBtn.classList.remove('active');
            this.aiStatusLabel.textContent = 'OFF';
            if (this.aiDecisionDisplay) {
                this.aiDecisionDisplay.textContent = 'STANDBY';
            }
            this.clearTargetLock();
        }
    }

    startAiLoop() {
        this.stopAiLoop();
        const model = AI_MODELS[this.currentAiModelKey] || AI_MODELS.veteran;
        this.aiTimer = setInterval(() => this.aiThinkAndAct(), model.scanInterval);
    }

    // ==========================================
    // 長輩與無障礙大字系統 (A11Y BIG FONT SYSTEM)
    // ==========================================
    initA11yMode() {
        try {
            if (typeof localStorage !== 'undefined') {
                const saved = localStorage.getItem('TYPING_A11Y_MODE');
                if (saved === 'true') {
                    this.setA11yMode(true);
                }
            }
        } catch (e) {}
    }

    toggleA11yMode() {
        this.setA11yMode(!this.isA11yMode);
    }

    setA11yMode(enabled) {
        this.isA11yMode = enabled;
        const container = document.getElementById('game-container') || (typeof document !== 'undefined' ? document.body : null);
        if (container) {
            if (enabled) {
                container.classList.add('a11y-mode');
            } else {
                container.classList.remove('a11y-mode');
            }
        }
        if (this.a11yStatusLabel) {
            this.a11yStatusLabel.textContent = enabled ? 'ON' : 'OFF';
            this.a11yStatusLabel.style.color = enabled ? 'var(--accent-yellow)' : '';
        }
        if (this.modalA11yLabel) {
            this.modalA11yLabel.textContent = enabled ? 'ON' : 'OFF';
            this.modalA11yLabel.style.color = enabled ? 'var(--accent-yellow)' : '';
        }
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('TYPING_A11Y_MODE', enabled ? 'true' : 'false');
            }
        } catch (e) {}
    }

    // ==========================================
    // 虛擬鍵盤構建與 AI 視覺凝視系統 (AI GAZE & KEYBOARD)
    // ==========================================
    buildVirtualKeyboard() {
        if (!this.virtualKeyboard) return;
        this.charToKeyMap = new Map();
        this.shiftKeyElements = [];

        // 保留 reticle 節點
        const reticle = this.aiGazeReticle;
        this.virtualKeyboard.innerHTML = '';
        if (reticle) this.virtualKeyboard.appendChild(reticle);

        KEYBOARD_LAYOUT.forEach((rowDef, rowIdx) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'keyboard-row';
            rowEl.id = `kb-row-${rowIdx + 1}`;

            rowDef.forEach(keyDef => {
                const keyEl = document.createElement('button');
                keyEl.type = 'button';
                let widthClass = '';
                if (keyDef.width) widthClass = `vkey-${keyDef.width}`;
                keyEl.className = `vkey ${widthClass}`;

                if (keyDef.isShift) {
                    this.shiftKeyElements.push(keyEl);
                }

                if (keyDef.shift && keyDef.key) {
                    keyEl.innerHTML = `<span class="vkey-sub">${keyDef.shift}</span><span class="vkey-main">${keyDef.key.toUpperCase()}</span>`;
                } else if (keyDef.label) {
                    keyEl.innerHTML = `<span class="vkey-main">${keyDef.label}</span>`;
                } else {
                    keyEl.innerHTML = `<span class="vkey-main">${keyDef.key}</span>`;
                }

                // 註冊滑鼠/觸控點擊事件（玩家也可點擊虛擬鍵盤操作）
                keyEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!this.isPlaying) return;
                    if (keyDef.key === ' ' && this.bombs > 0) {
                        this.triggerEmpBomb();
                        return;
                    }
                    const charToFire = keyDef.key;
                    if (charToFire && charToFire.length === 1) {
                        this.handleKeyInput(charToFire);
                    }
                });

                // 註冊字元對映
                if (keyDef.key && keyDef.key.length === 1) {
                    this.charToKeyMap.set(keyDef.key, { element: keyEl, needsShift: false });
                }
                if (keyDef.shift && keyDef.shift.length === 1) {
                    this.charToKeyMap.set(keyDef.shift, { element: keyEl, needsShift: true });
                }
                if (keyDef.key === ' ') {
                    this.charToKeyMap.set(' ', { element: keyEl, needsShift: false });
                    this.spaceKeyElement = keyEl;
                }

                rowEl.appendChild(keyEl);
            });

            this.virtualKeyboard.appendChild(rowEl);
        });
    }

    aiGazeAtKey(char) {
        if (!this.charToKeyMap || !this.charToKeyMap.has(char)) return;
        const entry = this.charToKeyMap.get(char);
        const keyEl = entry.element;
        if (!keyEl) return;

        // 清除先前的凝視光暈與 Shift 激發
        this.clearGaze();

        // 啟動 Shift 燈（若目標字元需要 Shift）
        if (entry.needsShift) {
            this.shiftKeyElements.forEach(sEl => sEl.classList.add('vkey-shift-active'));
        }

        // 為目標鍵加上 AI 鎖定黃金光暈
        keyEl.classList.add('vkey-gazed');

        // 移動 AI 瞄準準星到虛擬按鍵上方
        if (this.aiGazeReticle && this.virtualKeyboard) {
            const left = keyEl.offsetLeft || 0;
            const top = keyEl.offsetTop || 0;
            const width = keyEl.offsetWidth || 30;
            const height = keyEl.offsetHeight || 28;

            this.aiGazeReticle.style.left = `${left}px`;
            this.aiGazeReticle.style.top = `${top}px`;
            this.aiGazeReticle.style.width = `${width}px`;
            this.aiGazeReticle.style.height = `${height}px`;

            const labelEl = this.aiGazeReticle.querySelector('.reticle-label');
            if (labelEl) {
                const displayChar = char === ' ' ? 'SPACE' : char;
                labelEl.textContent = `AI GAZE: [${displayChar}]`;
            }

            this.aiGazeReticle.classList.remove('hidden');
        }
    }

    clearGaze() {
        if (this.virtualKeyboard) {
            const gazedKeys = this.virtualKeyboard.querySelectorAll ? this.virtualKeyboard.querySelectorAll('.vkey-gazed') : [];
            for (const k of gazedKeys) k.classList.remove('vkey-gazed');
        }
        if (this.shiftKeyElements) {
            this.shiftKeyElements.forEach(s => s.classList.remove('vkey-shift-active'));
        }
    }

    visualPressKey(char) {
        if (!this.charToKeyMap || !this.charToKeyMap.has(char)) return;
        const entry = this.charToKeyMap.get(char);
        const keyEl = entry.element;
        if (!keyEl) return;

        keyEl.classList.add('vkey-pressed');
        if (entry.needsShift) {
            this.shiftKeyElements.forEach(s => s.classList.add('vkey-shift-active'));
        }

        setTimeout(() => {
            keyEl.classList.remove('vkey-pressed');
            keyEl.classList.remove('vkey-gazed');
            if (entry.needsShift) {
                this.shiftKeyElements.forEach(s => s.classList.remove('vkey-shift-active'));
            }
        }, 120);
    }

    stopAiLoop() {
        if (this.aiTimer) {
            clearInterval(this.aiTimer);
            this.aiTimer = null;
        }
        this.clearTargetLock();
        this.clearGaze();
        if (this.aiGazeReticle) {
            this.aiGazeReticle.classList.add('hidden');
        }
        this.aiIsExecuting = false;
    }

    restartAiLoop() {
        if (this.isAiPilot && this.isPlaying) {
            this.startAiLoop();
        }
    }

    clearTargetLock() {
        if (this.lockedTargetId) {
            const el = document.getElementById(this.lockedTargetId);
            if (el) el.classList.remove('ai-locked-target');
            this.lockedTargetId = null;
        }
    }

    aiThinkAndAct() {
        if (!this.isPlaying || !this.isAiPilot || this.aiIsExecuting) return;

        // 當場上沒有目標時
        if (this.targets.length === 0) {
            this.clearTargetLock();
            this.clearGaze();
            if (this.aiGazeReticle) this.aiGazeReticle.classList.add('hidden');
            if (this.aiDecisionDisplay) this.aiDecisionDisplay.textContent = 'SEARCHING SKY...';
            return;
        }

        const model = AI_MODELS[this.currentAiModelKey] || AI_MODELS.veteran;

        // 威脅評估演算法：Y 軸越深（越接近底部防衛線）+ 下落速度越快 = 威脅最高
        let bestTarget = null;
        let highestThreat = -Infinity;

        for (const target of this.targets) {
            const threat = target.y + (target.speed * 2.5);
            if (threat > highestThreat) {
                highestThreat = threat;
                bestTarget = target;
            }
        }

        if (!bestTarget) return;

        // AI 智慧施放大招判定：若持有 EMP 核彈且 (場上敵人 >= 4 或最高威脅目標即將觸底)
        if (this.bombs > 0 && this.battlefield) {
            const fieldHeight = this.battlefield.clientHeight - 40;
            const isCrowded = this.targets.length >= 4;
            const isEmergency = bestTarget && (bestTarget.y >= fieldHeight - 110);
            if (isCrowded || isEmergency) {
                if (this.aiDecisionDisplay) {
                    this.aiDecisionDisplay.textContent = '⚡ AI EMERGENCY: DETONATING EMP!';
                }
                this.triggerEmpBomb();
                return;
            }
        }

        // 更新視覺鎖定框
        if (this.lockedTargetId !== bestTarget.id) {
            this.clearTargetLock();
            bestTarget.element.classList.add('ai-locked-target');
            this.lockedTargetId = bestTarget.id;
        }

        // 計算距離底部剩餘估計時間 (TTL: Time To Live)
        const fieldHeight = this.battlefield.clientHeight - 40;
        const remainingDistance = Math.max(0, fieldHeight - bestTarget.y);
        const ttl = (remainingDistance / Math.max(1, bestTarget.speed)).toFixed(1);

        if (this.aiDecisionDisplay) {
            const safeChar = bestTarget.char === ' ' ? 'SPC' : bestTarget.char;
            this.aiDecisionDisplay.textContent = `TARGET [${safeChar}] TTL: ${ttl}s`;
        }

        // 核心亮點：AI 視線立即凝視虛擬鍵盤對應鍵 (AI Gaze) 並啟動 Shift 燈
        this.aiGazeAtKey(bestTarget.char);

        // 模擬模型反應延遲與按鍵動作
        this.aiIsExecuting = true;
        const delay = model.minDelay + Math.random() * (model.maxDelay - model.minDelay);

        setTimeout(() => {
            if (!this.isPlaying || !this.isAiPilot) {
                this.aiIsExecuting = false;
                return;
            }

            // 根據模型準確度判斷是否命中或是手滑
            let keyToPress = bestTarget.char;
            if (Math.random() > model.accuracy) {
                // 模擬誤按手滑鍵
                keyToPress = ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];
                this.aiGazeAtKey(keyToPress);
            }

            this.handleKeyInput(keyToPress);
            this.aiIsExecuting = false;
        }, delay);
    }
}

// ==========================================
// GITHUB PAGES / STATIC HOST LOCALSTORAGE FALLBACK
// ==========================================
const DEFAULT_CLIENT_SCORES = [
    { id: 'pilot-1', name: 'NEO_CYPHER', score: 3850, maxCombo: 42, accuracy: 98 },
    { id: 'pilot-2', name: 'GHOST_01', score: 2980, maxCombo: 31, accuracy: 95 },
    { id: 'pilot-3', name: 'AI_AGI_OVERLORD', score: 2606, maxCombo: 41, accuracy: 96 },
    { id: 'pilot-4', name: 'TRINITY', score: 2420, maxCombo: 28, accuracy: 92 },
    { id: 'pilot-5', name: 'ZERO_COOL', score: 1890, maxCombo: 22, accuracy: 89 }
];

function getClientScores() {
    try {
        const stored = localStorage.getItem('CYBER_NET_SCORES');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return DEFAULT_CLIENT_SCORES;
}

function saveClientScores(scores) {
    try {
        localStorage.setItem('CYBER_NET_SCORES', JSON.stringify(scores.slice(0, 50)));
    } catch (e) {}
}

function renderClientLeaderboardHtml(scores, highlightedId = null) {
    const sorted = [...scores].sort((a, b) => b.score - a.score || b.accuracy - a.accuracy).slice(0, 10);
    const rows = sorted.map((entry, idx) => {
        const rank = idx + 1;
        let rankBadgeClass = 'rank-normal';
        if (rank === 1) rankBadgeClass = 'rank-gold';
        else if (rank === 2) rankBadgeClass = 'rank-silver';
        else if (rank === 3) rankBadgeClass = 'rank-bronze';

        const isNew = entry.id === highlightedId ? 'class="new-entry-highlight"' : '';
        const nameEscaped = String(entry.name || 'ROOKIE')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        return `
            <tr ${isNew}>
                <td class="rank-col"><span class="rank-badge ${rankBadgeClass}">#${rank}</span></td>
                <td class="name-col">${nameEscaped}</td>
                <td class="score-col">${(entry.score || 0).toLocaleString()}</td>
                <td class="combo-col">${entry.maxCombo || 0}x</td>
                <td class="accuracy-col">${entry.accuracy || 100}%</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="leaderboard-card">
            <div class="leaderboard-header">
                <span class="leaderboard-tag">CYBER_NET // TOP 10 PILOTS (WEB CLOUD)</span>
                <span class="leaderboard-status-dot"></span>
            </div>
            <div class="leaderboard-table-container">
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th>RANK</th>
                            <th>CALLSIGN</th>
                            <th>SCORE</th>
                            <th>COMBO</th>
                            <th>ACC</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-secondary);">尚無防衛戰紀錄</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function initStaticHostInterceptors() {
    if (typeof document === 'undefined' || !document.body) return;

    document.body.addEventListener('htmx:beforeRequest', (evt) => {
        const isStaticHost = typeof window !== 'undefined' && 
            (window.location.hostname.endsWith('github.io') || 
             window.location.protocol === 'file:' || 
             (window.location.hostname === 'localhost' && window.location.port === ''));

        // 如果在純靜態環境（如 GitHub Pages），攔截請求由 LocalStorage 處理
        if (isStaticHost) {
            const detail = evt.detail;
            const target = detail.target;
            const path = detail.path || '';

            if (path.includes('/api/leaderboard')) {
                evt.preventDefault();
                const scores = getClientScores();
                target.innerHTML = renderClientLeaderboardHtml(scores);
            } else if (path.includes('/api/score')) {
                evt.preventDefault();
                const params = detail.parameters || {};
                const name = String(params.name || 'ROOKIE').toUpperCase().slice(0, 16);
                const score = parseInt(params.score, 10) || 0;
                const maxCombo = parseInt(params.maxCombo, 10) || 0;
                const accuracy = parseInt(params.accuracy, 10) || 100;

                const newId = `rec-${Date.now()}`;
                const scores = getClientScores();
                scores.push({ id: newId, name, score, maxCombo, accuracy });
                saveClientScores(scores);

                target.innerHTML = renderClientLeaderboardHtml(scores, newId);
                const subBox = document.getElementById('submission-box');
                if (subBox) {
                    subBox.innerHTML = '<p style="color: var(--accent-green); font-weight: 700;">✓ 戰績已同步登錄至 CYBER_NET 本地雲端榜！</p>';
                }
            }
        }
    });

    // 容錯機制：若有網路連線錯誤，自動降級為本地儲存榜單
    document.body.addEventListener('htmx:responseError', (evt) => {
        const detail = evt.detail;
        if (detail && detail.path && detail.path.includes('/api/leaderboard') && detail.target) {
            const scores = getClientScores();
            detail.target.innerHTML = renderClientLeaderboardHtml(scores);
        }
    });
}

// 頁面加載完成後實體化
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.game = new TypingGame();
        initStaticHostInterceptors();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TypingGame, AI_MODELS };
}

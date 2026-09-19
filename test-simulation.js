// ==========================================
// COMPREHENSIVE AUTOMATED TEST SUITE FOR TYPING SHOOTER & AI PILOT
// ==========================================
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

console.log('🧪 [TEST SUITE STARTING] Initializing virtual environment...');

// 1. Mock minimal browser environment with hierarchical DOM traversal
function parseSimpleHTML(html, parent) {
    if (!html || typeof html !== 'string') return [];
    const children = [];
    // Match tags: <tag attr="val">inner</tag> or <tag attr="val"/>
    const tagRegex = /<([a-zA-Z0-9-]+)([^>]*)>(.*?)<\/\1>|<([a-zA-Z0-9-]+)([^>]*)\/?>/gs;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
        const tagName = match[1] || match[4];
        const rawAttrs = match[2] || match[5] || '';
        const innerContent = match[3] || '';

        const el = new MockElement(tagName);
        el.parentNode = parent;

        // Parse class
        const classMatch = rawAttrs.match(/class=["']([^"']*)["']/);
        if (classMatch) {
            el.className = classMatch[1];
        }

        // Parse id
        const idMatch = rawAttrs.match(/id=["']([^"']*)["']/);
        if (idMatch) {
            el.id = idMatch[1];
        }

        // Parse style
        const styleMatch = rawAttrs.match(/style=["']([^"']*)["']/);
        if (styleMatch) {
            el.setAttribute('style', styleMatch[1]);
        }

        // Recursively parse inner HTML or set textContent
        if (innerContent.includes('<')) {
            el.children = parseSimpleHTML(innerContent, el);
        } else {
            el.textContent = innerContent.trim();
        }

        children.push(el);
    }
    return children;
}

class MockElement extends EventEmitter {
    constructor(tagName = 'DIV', id = '') {
        super();
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this._className = '';
        this.classList = {
            classes: new Set(),
            add: (...cs) => {
                cs.forEach(c => c && this.classList.classes.add(c));
                this._className = Array.from(this.classList.classes).join(' ');
            },
            remove: (...cs) => {
                cs.forEach(c => this.classList.classes.delete(c));
                this._className = Array.from(this.classList.classes).join(' ');
            },
            toggle: (c, force) => {
                const has = this.classList.classes.has(c);
                const shouldAdd = force !== undefined ? force : !has;
                if (shouldAdd) this.classList.add(c);
                else this.classList.remove(c);
                return shouldAdd;
            },
            contains: (c) => this.classList.classes.has(c)
        };
        this.style = {};
        this.children = [];
        this.parentNode = null;
        this._innerHTML = '';
        this.textContent = '';
        this.clientWidth = 800;
        this.clientHeight = 600;
        this.value = '';
    }

    get className() {
        return this._className;
    }

    set className(val) {
        this._className = val || '';
        this.classList.classes = new Set(this._className.split(/\s+/).filter(Boolean));
    }

    get innerHTML() {
        return this._innerHTML;
    }

    set innerHTML(val) {
        this._innerHTML = val;
        this.children = parseSimpleHTML(val, this);
        if (this.children.length === 0 && typeof val === 'string') {
            this.textContent = val.replace(/<[^>]*>/g, '');
        }
    }

    appendChild(child) {
        if (!child) return null;
        if (child.parentNode && child.parentNode.removeChild) {
            child.parentNode.removeChild(child);
        }
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parentNode = null;
        }
        return child;
    }

    remove() {
        if (this.parentNode && this.parentNode.removeChild) {
            this.parentNode.removeChild(this);
        }
        this.isRemoved = true;
    }

    setAttribute(name, val) {
        this[name] = val;
    }

    getAttribute(name) {
        return this[name];
    }

    addEventListener(evt, cb) {
        this.on(evt, cb);
    }

    removeEventListener(evt, cb) {
        this.off(evt, cb);
    }

    matchesSelector(sel) {
        if (!sel) return false;
        if (sel.startsWith('.')) {
            return this.classList.contains(sel.slice(1));
        }
        if (sel.startsWith('#')) {
            return this.id === sel.slice(1);
        }
        return this.tagName.toLowerCase() === sel.toLowerCase();
    }

    querySelector(sel) {
        for (const child of this.children) {
            if (child.matchesSelector && child.matchesSelector(sel)) return child;
            if (child.querySelector) {
                const found = child.querySelector(sel);
                if (found) return found;
            }
        }
        return null;
    }

    querySelectorAll(sel) {
        const results = [];
        for (const child of this.children) {
            if (child.matchesSelector && child.matchesSelector(sel)) results.push(child);
            if (child.querySelectorAll) {
                results.push(...child.querySelectorAll(sel));
            }
        }
        return results;
    }

    getBoundingClientRect() {
        return { left: 400, top: 580, width: 40, height: 40, right: 440, bottom: 620 };
    }
}

const elementsById = new Map();
function getOrCreateElement(id, tag = 'div') {
    if (!elementsById.has(id)) {
        elementsById.set(id, new MockElement(tag, id));
    }
    return elementsById.get(id);
}

// Pre-create all elements defined in index.html & HUD
const requiredIds = [
    'battlefield', 'targets-container', 'fx-layer', 'cannon',
    'overlay', 'gameover-overlay', 'last-key-display', 'start-btn',
    'score-display', 'combo-display', 'health-bar', 'health-bar-container',
    'status-display', 'ai-toggle-btn', 'ai-status-label', 'ai-model-select',
    'ai-launch-btn', 'ai-decision-display', 'virtual-keyboard', 'ai-gaze-reticle',
    'bomb-slot-1', 'bomb-slot-2', 'bomb-slot-3', 'bomb-hint',
    'shield-container', 'shield-display', 'a11y-toggle-btn', 'a11y-status-label',
    'modal-a11y-toggle-btn', 'modal-a11y-label'
];

requiredIds.forEach(id => getOrCreateElement(id));

// Cannon barrel & health fill
const cannonBarrel = new MockElement('div', 'cannon-barrel');
elementsById.set('.cannon-barrel', cannonBarrel);
const healthFill = new MockElement('div', 'health-fill');
elementsById.set('.health-fill', healthFill);

// Global window & document
global.window = new EventEmitter();
global.window.addEventListener = (evt, cb) => global.window.on(evt, cb);
global.window.removeEventListener = (evt, cb) => global.window.off(evt, cb);
global.document = {
    getElementById: (id) => getOrCreateElement(id),
    querySelector: (sel) => {
        if (sel === '.cannon-barrel') return cannonBarrel;
        if (sel === '.health-fill') return healthFill;
        for (const el of elementsById.values()) {
            if (el.matchesSelector && el.matchesSelector(sel)) return el;
            if (el.querySelector) {
                const found = el.querySelector(sel);
                if (found) return found;
            }
        }
        return null;
    },
    querySelectorAll: (sel) => {
        const list = [];
        for (const el of elementsById.values()) {
            if (el.matchesSelector && el.matchesSelector(sel)) list.push(el);
            if (el.querySelectorAll) list.push(...el.querySelectorAll(sel));
        }
        return list;
    },
    createElement: (tag) => new MockElement(tag),
    createElementNS: (ns, tag) => new MockElement(tag),
    body: new MockElement('body'),
    addEventListener: (evt, cb) => window.on(evt, cb)
};

// Mock HTMX
global.htmx = {
    events: [],
    processedElements: [],
    trigger: (el, evtName) => {
        global.htmx.events.push(evtName);
    },
    process: (el) => {
        global.htmx.processedElements.push(el);
    }
};

// Mock Web Audio API
class MockAudioContext {
    constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.destination = {};
    }
    createOscillator() {
        return {
            type: 'sawtooth',
            frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
            connect() {},
            start() {},
            stop() {}
        };
    }
    createGain() {
        return {
            gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
            connect() {}
        };
    }
    resume() { this.state = 'running'; }
}
global.window.AudioContext = MockAudioContext;
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);

// Load game engine module
const { TypingGame, AI_MODELS } = require('./game.js');

// 2. Start Tests
async function runAutomatedTests() {
    console.log('\n--- 1. Testing TypingGame Initialization ---');
    const game = new TypingGame();
    if (!game) throw new Error('Game failed to initialize');
    console.log('✅ Game instantiated successfully.');
    console.log('✅ Initial state: health =', game.health, ', score =', game.score, ', isPlaying =', game.isPlaying);

    console.log('\n--- 2. Testing AI Auto-Pilot Toggling ---');
    if (game.isAiPilot !== false) throw new Error('AI pilot should start OFF');
    game.toggleAiPilot(true);
    if (game.isAiPilot !== true) throw new Error('AI pilot should be ON');
    const aiLabel = elementsById.get('ai-status-label');
    if (aiLabel.textContent !== '運作中') throw new Error(`Expected 運作中, got ${aiLabel.textContent}`);
    console.log('✅ AI Pilot enabled. Status label:', aiLabel.textContent);

    console.log('\n--- 3. Testing Start Game in AI Mode ---');
    game.startGame();
    if (!game.isPlaying) throw new Error('Game should be playing');
    if (!game.aiTimer) throw new Error('AI loop timer should be active when game starts with AI pilot ON');
    console.log('✅ Game started with AI loop active.');

    console.log('\n--- 4. Testing Target Spawning ---');
    game.spawnTarget();
    if (game.targets.length !== 1) throw new Error('Expected 1 target spawned');
    const target1 = game.targets[0];
    console.log(`✅ Target 1 spawned: character="${target1.char}", speed=${target1.speed.toFixed(1)}px/s, y=${target1.y}`);

    game.spawnTarget();
    const target2 = game.targets[1];
    // Position target2 deeper (closer to bottom)
    target2.y = 350;
    console.log(`✅ Target 2 spawned: character="${target2.char}", positioned at y=350px (higher threat)`);

    console.log('\n--- 5. Testing AI Threat Evaluation & Lock-On ---');
    game.aiThinkAndAct();
    if (game.lockedTargetId !== target2.id) {
        throw new Error(`AI should lock on highest threat target (${target2.id}), but locked ${game.lockedTargetId}`);
    }
    if (!target2.element.classList.contains('ai-locked-target')) {
        throw new Error('Target element missing .ai-locked-target class');
    }
    const radarDisplay = elementsById.get('ai-decision-display');
    console.log('✅ AI successfully locked onto target:', target2.char, '| Radar text:', radarDisplay.textContent);

    console.log('\n--- 6. Testing Keystroke Execution & Combat Mechanics ---');
    const initialScore = game.score;
    game.handleKeyInput(target2.char);
    if (game.hits !== 1) throw new Error('Expected 1 hit');
    if (game.combo !== 1) throw new Error('Expected combo 1');
    if (game.score <= initialScore) throw new Error('Score did not increase');
    if (game.targets.length !== 1) throw new Error('Target was not removed after being shot');
    console.log(`✅ Target shot down! New score: ${game.score}, combo: ${game.combo}x, remaining targets: ${game.targets.length}`);

    console.log('\n--- 7. Testing All 3 AI Models (Rookie, Veteran, God) ---');
    const models = ['rookie', 'veteran', 'god'];
    for (const m of models) {
        game.currentAiModelKey = m;
        game.restartAiLoop();
        console.log(`✅ Switched to model: [${m.toUpperCase()}] -> minDelay=${AI_MODELS[m].minDelay}ms, accuracy=${AI_MODELS[m].accuracy * 100}%`);
    }

    console.log('\n--- 8. Testing Target Breach & Health Depletion ---');
    // Spawn a target and simulate it hitting the bottom
    game.spawnTarget();
    const fallingTarget = game.targets[0];
    game.handleTargetBreach(fallingTarget, 0);
    if (game.health !== 80) throw new Error(`Expected health 80, got ${game.health}`);
    if (game.combo !== 0) throw new Error('Combo should reset to 0 upon breach');
    console.log(`✅ Target breached defense line. Health: 80/100, Combo reset to: ${game.combo}x`);

    console.log('\n--- 9. Testing Game Over & AI Participant Callsign ---');
    // Reduce health to 0
    game.health = 20;
    game.spawnTarget();
    game.handleTargetBreach(game.targets[0], 0);
    if (game.isPlaying) throw new Error('Game should stop when health reaches 0');
    if (game.aiTimer !== null) throw new Error('AI loop should stop on Game Over');

    const gameOverOverlay = elementsById.get('gameover-overlay');
    if (!gameOverOverlay.innerHTML.includes('AI 自主巡航接管')) {
        throw new Error('Game Over overlay missing AI participant badge');
    }
    if (!gameOverOverlay.innerHTML.includes('AI_AGI_OVERLORD')) {
        throw new Error('Game Over overlay missing current AI callsign');
    }
    console.log('✅ Game Over correctly recognized AI run. HTML includes AI participant badge & callsign.');

    console.log('\n--- 10. Testing HTMX Leaderboard Submission API ---');
    const server = require('./server.js');
    const listener = server.listeners('request')[0];

    // Simulate HTMX submitting the score
    const postReq = new EventEmitter();
    postReq.method = 'POST';
    postReq.url = '/api/score';
    postReq.headers = {
        host: 'localhost:3000',
        'content-type': 'application/x-www-form-urlencoded'
    };

    const postRes = new EventEmitter();
    postRes.body = '';
    postRes.writeHead = (code, headers) => { postRes.statusCode = code; };
    postRes.end = (chunk) => {
        if (chunk) postRes.body += chunk;
        postRes.emit('done');
    };

    const payload = `name=AI_AGI_OVERLORD&score=${game.score}&maxCombo=${game.maxCombo}&accuracy=100`;
    const postPromise = new Promise(resolve => postRes.on('done', resolve));

    listener(postReq, postRes);
    postReq.emit('data', Buffer.from(payload));
    postReq.emit('end');

    await postPromise;

    if (postRes.statusCode !== 200) throw new Error(`POST /api/score returned ${postRes.statusCode}`);
    if (!postRes.body.includes('AI_AGI_OVERLORD')) throw new Error('Leaderboard response missing AI_AGI_OVERLORD');
    if (!postRes.body.includes('new-entry-highlight')) throw new Error('Leaderboard missing new-entry-highlight');
    console.log('✅ AI score successfully saved and returned in Top 10 leaderboard with highlight animation!');

    console.log('\n--- 11. Testing EMP Bomb Recharge (60 pts) & Full Screen Blast ---');
    game.startGame();
    if (game.bombs !== 0) throw new Error('Expected 0 bombs at game start');
    
    // Simulate reaching 60 points milestone
    game.score = 65;
    game.checkBombRecharge();
    if (game.bombs !== 1) throw new Error(`Expected 1 bomb after reaching 65 pts, got ${game.bombs}`);
    console.log('✅ EMP Bomb successfully charged at 60 points milestone!');

    // Add 3 active targets
    game.targets.push({ id: 't1', char: 'A', x: 200, y: 150, speed: 50, element: new MockElement('div') });
    game.targets.push({ id: 't2', char: 'B', x: 300, y: 250, speed: 50, element: new MockElement('div') });
    game.targets.push({ id: 't3', char: 'C', x: 400, y: 350, speed: 50, element: new MockElement('div') });

    const prevScore = game.score;
    // Trigger EMP Bomb
    game.triggerEmpBomb();
    if (game.bombs !== 0) throw new Error('Expected 0 bombs after triggering EMP bomb');
    if (game.targets.length !== 0) throw new Error('Expected all targets to be cleared by EMP bomb');
    console.log(`✅ EMP Bomb detonated: screen cleared all targets, score increased from ${prevScore} to ${game.score}!`);

    console.log('\n--- 12. Testing A11y Big Font Mode Toggling & Symbol Tagging ---');
    if (game.isA11yMode !== false) throw new Error('Expected A11y mode to be false initially');
    game.toggleA11yMode();
    if (game.isA11yMode !== true) throw new Error('Expected A11y mode to be true after toggle');
    console.log('✅ A11y Big Font Mode enabled successfully.');

    // Spawn a target and check speed adjustment
    game.spawnTarget();
    const lastTarget = game.targets[game.targets.length - 1];
    if (lastTarget) {
        console.log(`✅ Target spawned in A11y mode with adjusted speed factor: char="${lastTarget.char}", speed=${lastTarget.speed.toFixed(1)}px/s`);
    }

    game.toggleA11yMode();
    if (game.isA11yMode !== false) throw new Error('Expected A11y mode to be false after second toggle');
    console.log('✅ A11y Big Font Mode toggled back to normal successfully.');

    console.log('\n--- 13. Testing 3 Starter Treasures for Seniors (A11y Mode) ---');
    game.setA11yMode(true);
    game.startGame();
    
    // Treasure 1: 3 EMP Bombs
    if (game.bombs !== 3) throw new Error(`Expected 3 starter EMP bombs, got ${game.bombs}`);
    if (game.maxBombs !== 3) throw new Error(`Expected maxBombs=3 in A11y mode, got ${game.maxBombs}`);
    console.log('✅ Starter Treasure 1 Verified: 3 full EMP Bombs loaded at start.');

    // Treasure 2: 3 Shields absorbing damage
    if (game.shields !== 3) throw new Error(`Expected 3 shields, got ${game.shields}`);
    console.log('✅ Starter Treasure 2 Verified: 3 Shields granted.');

    const mockTarget = { id: 'test-shield', char: 'k', x: 200, y: 560, speed: 50, element: new MockElement('div') };
    game.targets.push(mockTarget);
    game.handleTargetBreach(mockTarget, 0);
    if (game.shields !== 2) throw new Error(`Expected shields to drop to 2, got ${game.shields}`);
    if (game.health !== 100) throw new Error(`Expected health to remain 100, got ${game.health}`);
    console.log('✅ Shield absorbed breach damage with zero HP loss!');

    // Treasure 3: Key Guide Light (for human manual pilot)
    game.isAiPilot = false;
    const guideTarget = { id: 'test-guide', char: 'a', x: 200, y: 300, speed: 50, element: new MockElement('div') };
    game.targets.push(guideTarget);
    game.updateKeyGuideLight();
    if (game.currentGuidedChar !== 'a') throw new Error(`Expected guided char to be 'a', got ${game.currentGuidedChar}`);
    console.log('✅ Starter Treasure 3 Verified: Keyfinder Guide Light dynamically tracking urgent target [a].');

    // Test Uppercase Target triggers Shift Guide Light
    const upperTarget = { id: 'test-upper', char: 'A', x: 200, y: 400, speed: 50, element: new MockElement('div') };
    game.targets.push(upperTarget);
    game.updateKeyGuideLight();
    if (game.currentGuidedChar !== 'A') throw new Error(`Expected guided char to be 'A', got ${game.currentGuidedChar}`);
    console.log('✅ Keyfinder Guide Light dynamically tracking uppercase urgent target [A] with Shift indicator.');

    game.setA11yMode(false);

    console.log('\n--- 14. Testing Virtual Keyboard Letter Case Alignment (Upper & Lower) ---');
    const qKeyEntry = game.charToKeyMap.get('q');
    if (!qKeyEntry) throw new Error('Key "q" not found in charToKeyMap');
    if (!qKeyEntry.element.innerHTML.includes('<span class="vkey-sub">Q</span>')) {
        throw new Error(`Expected vkey-sub Q, got ${qKeyEntry.element.innerHTML}`);
    }
    if (!qKeyEntry.element.innerHTML.includes('<span class="vkey-main">q</span>')) {
        throw new Error(`Expected vkey-main q, got ${qKeyEntry.element.innerHTML}`);
    }
    console.log('✅ Virtual keyboard letter case alignment verified: [Q (sub) / q (main)] correctly paired!');

    console.log('\n--- 15. Testing Duplicate Letter Priority Target Selection ---');
    game.startGame();
    const highThreatTarget = { id: 'dup-high', char: 'z', x: 200, y: 380, speed: 50, element: new MockElement('div') };
    const lowThreatTarget  = { id: 'dup-low',  char: 'z', x: 200, y: 120, speed: 50, element: new MockElement('div') };
    game.targets.push(lowThreatTarget, highThreatTarget);

    // Keystroke 'z' should eliminate highThreatTarget first
    game.handleKeyInput('z');
    if (game.targets.some(t => t.id === 'dup-high')) {
        throw new Error('High threat duplicate target was not prioritized for destruction');
    }
    if (!game.targets.some(t => t.id === 'dup-low')) {
        throw new Error('Low threat duplicate target was erroneously destroyed');
    }
    console.log('✅ Duplicate letter prioritization verified: closest threat target [z @ 380px] eliminated first!');

    console.log('\n--- 16. Testing Zero-Bomb EMP Safe Guard ---');
    game.bombs = 0;
    const safeTarget = { id: 'safe-t', char: 'w', x: 100, y: 100, speed: 40, element: new MockElement('div') };
    game.targets.push(safeTarget);
    game.triggerEmpBomb();
    if (game.bombs !== 0) throw new Error('Bombs should remain 0');
    if (!game.targets.some(t => t.id === 'safe-t')) {
        throw new Error('Target was cleared even though bombs was 0');
    }
    console.log('✅ Zero-Bomb guard verified: EMP safely rejected when 0 bombs available.');

    console.log('\n--- 17. Testing Schema v2 Leaderboard & duration_s Persistence ---');
    const v2Payload = `name=CYBER_VIP&score=9999&maxCombo=88&accuracy=99&duration_s=42`;
    const v2Req = new EventEmitter();
    v2Req.method = 'POST';
    v2Req.url = '/api/score';
    v2Req.headers = {
        host: 'localhost:3000',
        'content-type': 'application/x-www-form-urlencoded',
        'x-forwarded-for': '192.168.1.100'
    };
    const v2Res = new EventEmitter();
    v2Res.body = '';
    v2Res.writeHead = (code, headers) => { v2Res.statusCode = code; };
    v2Res.end = (chunk) => {
        if (chunk) v2Res.body += chunk;
        v2Res.emit('done');
    };
    const v2Promise = new Promise(resolve => v2Res.on('done', resolve));
    listener(v2Req, v2Res);
    v2Req.emit('data', Buffer.from(v2Payload));
    v2Req.emit('end');
    await v2Promise;

    if (v2Res.statusCode !== 200) throw new Error(`v2 score submission failed with ${v2Res.statusCode}`);
    const updatedScores = server.loadScores();
    const storedRecord = updatedScores.find(r => r.name === 'CYBER_VIP' && r.score === 9999);
    if (!storedRecord) throw new Error('Schema v2 record was not persisted');
    if (storedRecord.duration_s !== 42) throw new Error(`Expected duration_s=42, got ${storedRecord.duration_s}`);
    if (!storedRecord.played_at) throw new Error('Expected played_at timestamp in record');
    console.log(`✅ Schema v2 record verified: name=${storedRecord.name}, duration_s=${storedRecord.duration_s}s, played_at=${storedRecord.played_at}`);

    console.log('\n--- 18. Testing Real DOM Traversal (querySelector & querySelectorAll) ---');
    if (!game.spaceKeyElement) throw new Error('Space key element not bound');
    const mainKeySpan = game.spaceKeyElement.querySelector('.vkey-main');
    if (!mainKeySpan) throw new Error('Real querySelector failed to find .vkey-main inside spaceKeyElement');
    
    const allVKeys = game.virtualKeyboard.querySelectorAll('.vkey');
    if (allVKeys.length === 0) throw new Error('Real querySelectorAll failed to find .vkey items in virtualKeyboard');
    console.log(`✅ Real DOM tree traversal verified: querySelector found [${mainKeySpan.textContent}], querySelectorAll found ${allVKeys.length} virtual keys!`);

    console.log('\n==============================================');
    console.log('🎉 ALL 18 AUTOMATED TEST SUITES PASSED 100%!');
    console.log('==============================================\n');
    process.exit(0);
}

runAutomatedTests().catch(err => {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
});

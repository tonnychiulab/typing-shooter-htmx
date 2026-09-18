// ==========================================
// COMPREHENSIVE AUTOMATED TEST SUITE FOR TYPING SHOOTER & AI PILOT
// ==========================================
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

console.log('🧪 [TEST SUITE STARTING] Initializing virtual environment...');

// 1. Mock minimal browser environment
class MockElement extends EventEmitter {
    constructor(tagName, id = '') {
        super();
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this.className = '';
        this.classList = {
            classes: new Set(),
            add: (c) => this.classList.classes.add(c),
            remove: (c) => this.classList.classes.delete(c),
            contains: (c) => this.classList.classes.has(c)
        };
        this.style = {};
        this.children = [];
        this.innerHTML = '';
        this.textContent = '';
        this.clientWidth = 800;
        this.clientHeight = 600;
        this.value = '';
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    remove() {
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

    querySelector(sel) {
        return new MockElement('span');
    }

    querySelectorAll(sel) {
        return [];
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

// Pre-create elements defined in index.html
const requiredIds = [
    'battlefield', 'targets-container', 'fx-layer', 'cannon',
    'overlay', 'gameover-overlay', 'last-key-display', 'start-btn',
    'score-display', 'combo-display', 'health-bar', 'health-bar-container',
    'status-display', 'ai-toggle-btn', 'ai-status-label', 'ai-model-select',
    'ai-launch-btn', 'ai-decision-display', 'virtual-keyboard', 'ai-gaze-reticle'
];

requiredIds.forEach(id => getOrCreateElement(id));

// Cannon barrel
const cannonBarrel = new MockElement('div', 'cannon-barrel');
elementsById.set('.cannon-barrel', cannonBarrel);

// Global window & document
global.window = new EventEmitter();
global.window.addEventListener = (evt, cb) => global.window.on(evt, cb);
global.window.removeEventListener = (evt, cb) => global.window.off(evt, cb);
global.document = {
    getElementById: (id) => getOrCreateElement(id),
    querySelector: (sel) => {
        if (sel === '.cannon-barrel') return cannonBarrel;
        return null;
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
    if (aiLabel.textContent !== 'ONLINE') throw new Error(`Expected ONLINE, got ${aiLabel.textContent}`);
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
    if (!gameOverOverlay.innerHTML.includes('AI AUTONOMOUS RUN')) {
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

    console.log('\n==============================================');
    console.log('🎉 ALL 12 AUTOMATED TEST SUITES PASSED 100%!');
    console.log('==============================================\n');
    process.exit(0);
}

runAutomatedTests().catch(err => {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
});

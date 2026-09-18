// ==========================================
// FULL REALISTIC BATTLE SIMULATION (AI AGENT IN COMBAT)
// ==========================================
const { EventEmitter } = require('node:events');

// Setup environment
class MockElement extends EventEmitter {
    constructor(tagName, id = '') {
        super();
        this.tagName = tagName.toUpperCase();
        this.id = id;
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
        this.clientWidth = 1000;
        this.clientHeight = 700;
    }
    appendChild(child) { this.children.push(child); return child; }
    remove() { this.isRemoved = true; }
    setAttribute(k, v) { this[k] = v; }
    getAttribute(k) { return this[k]; }
    addEventListener(evt, cb) { this.on(evt, cb); }
    removeEventListener(evt, cb) { this.off(evt, cb); }
    querySelector(sel) { return new MockElement('span'); }
    querySelectorAll(sel) { return []; }
    getBoundingClientRect() { return { left: 500, top: 680, width: 50, height: 50 }; }
}

const elementsById = new Map();
function getEl(id) {
    if (!elementsById.has(id)) elementsById.set(id, new MockElement('div', id));
    return elementsById.get(id);
}

[
    'battlefield', 'targets-container', 'fx-layer', 'cannon',
    'overlay', 'gameover-overlay', 'last-key-display', 'start-btn',
    'score-display', 'combo-display', 'health-bar', 'health-bar-container',
    'status-display', 'ai-toggle-btn', 'ai-status-label', 'ai-model-select',
    'ai-launch-btn', 'ai-decision-display', 'virtual-keyboard', 'ai-gaze-reticle'
].forEach(id => getEl(id));

elementsById.set('.cannon-barrel', new MockElement('div', 'cannon-barrel'));

global.window = new EventEmitter();
global.window.addEventListener = (evt, cb) => global.window.on(evt, cb);
global.window.AudioContext = class {
    constructor() { this.state = 'running'; this.currentTime = 0; }
    createOscillator() {
        return {
            type: 'sawtooth',
            frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
            connect() {}, start() {}, stop() {}
        };
    }
    createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
    resume() {}
};

global.document = {
    getElementById: getEl,
    querySelector: (sel) => elementsById.get(sel) || null,
    createElement: (tag) => new MockElement(tag),
    createElementNS: (ns, tag) => new MockElement(tag),
    body: new MockElement('body'),
    addEventListener: (evt, cb) => global.window.on(evt, cb)
};

global.htmx = {
    trigger() {},
    process() {}
};

global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);

const { TypingGame, AI_MODELS } = require('./game.js');

async function runCombatSimulation() {
    console.log('⚔️ [SIMULATION] Starting full autonomous AI combat match...');
    const game = new TypingGame();

    // Select AGI GOD mode
    game.currentAiModelKey = 'god';
    game.toggleAiPilot(true);
    game.startGame();

    console.log(`🤖 AI Pilot [${AI_MODELS.god.label}] took control of the defenses.`);

    let totalSpawned = 0;
    let waveTicks = 0;

    // Simulate 35 seconds of intense combat compressed into rapid steps
    for (let tick = 0; tick < 35; tick++) {
        // Spawn 1-2 targets per tick
        game.spawnTarget();
        totalSpawned++;
        if (tick % 3 === 0) {
            game.spawnTarget();
            totalSpawned++;
        }

        // Simulate frame step: targets advance down
        for (let i = 0; i < game.targets.length; i++) {
            game.targets[i].y += 35; // move downwards
        }

        // AI evaluates battlefield
        game.aiThinkAndAct();

        // Wait a tiny simulated reaction delay
        await new Promise(r => setTimeout(r, 45));

        if (tick % 5 === 0) {
            console.log(`  [Wave Tick #${tick}] Score: ${game.score} | Combo: ${game.combo}x | Targets on screen: ${game.targets.length} | Health: ${game.health}%`);
        }
    }

    console.log('\n📊 Combat Simulation Results:');
    console.log(`  - Total Targets Spawned: ${totalSpawned}`);
    console.log(`  - Targets Destroyed: ${game.hits}`);
    console.log(`  - Final Score: ${game.score}`);
    console.log(`  - Max Combo Reached: ${game.maxCombo}x`);
    console.log(`  - Remaining Health: ${game.health}%`);
    console.log(`  - Hit Accuracy: ${game.hits > 0 ? Math.round((game.hits / (game.hits + game.misses)) * 100) : 100}%`);

    if (game.score < 200 || game.hits < 15) {
        throw new Error('AI combat simulation performance was below expected benchmark');
    }

    console.log('\n🏆 Autonomous AI combat performance verified successfully!');
    process.exit(0);
}

runCombatSimulation().catch(e => {
    console.error('Simulation error:', e);
    process.exit(1);
});

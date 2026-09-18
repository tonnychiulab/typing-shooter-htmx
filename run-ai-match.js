// ==========================================
// AUTONOMOUS AI PILOT TOURNAMENT MATCH RUNNER
// ==========================================
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

// Environment setup for headless execution
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
        this.clientWidth = 1000;
        this.clientHeight = 700;
    }
    appendChild(c) { this.children.push(c); return c; }
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
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
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

global.htmx = { trigger() {}, process() {} };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);

const { TypingGame, AI_MODELS } = require('./game.js');

// Parse CLI model choice: 'rookie', 'veteran', or 'god'
const chosenModelKey = process.argv[2]?.toLowerCase() || 'veteran';
const selectedModel = AI_MODELS[chosenModelKey] || AI_MODELS.veteran;

console.log('\n=============================================================');
console.log(`🤖 [CYBER_NET AI TOURNAMENT] Deploying Pilot: ${selectedModel.label}`);
console.log(`📡 Call-sign: ${selectedModel.name} | Precision: ${selectedModel.accuracy * 100}% | Reaction: ${selectedModel.minDelay}-${selectedModel.maxDelay}ms`);
console.log('=============================================================\n');

async function playTournamentMatch() {
    const game = new TypingGame();
    game.currentAiModelKey = chosenModelKey in AI_MODELS ? chosenModelKey : 'veteran';
    game.toggleAiPilot(true);
    game.startGame();

    let ticks = 0;
    const maxTicks = 45; // Match duration

    while (game.isPlaying && ticks < maxTicks) {
        ticks++;

        // Enemy generation waves
        game.spawnTarget();
        if (ticks % 3 === 0) game.spawnTarget();
        if (ticks % 7 === 0) game.spawnTarget();

        // Targets falling physics
        for (let i = game.targets.length - 1; i >= 0; i--) {
            const t = game.targets[i];
            t.y += 28 + (ticks * 0.4); // progressively faster
            if (t.y >= 560) {
                game.handleTargetBreach(t, i);
            }
        }

        // AI scanning and tactical strike
        game.aiThinkAndAct();

        // Wait a small physical delay
        await new Promise(r => setTimeout(r, 60));

        // Periodic live combat telemetry log
        if (ticks % 8 === 0 || !game.isPlaying) {
            const radarText = getEl('ai-decision-display').textContent || 'CLEAR';
            process.stdout.write(`  [Tick #${ticks.toString().padStart(2, '0')}] HP: ${game.health}% | Score: ${game.score.toString().padStart(4, ' ')} | Combo: ${game.combo}x | Radar: ${radarText}\n`);
        }
    }

    // Force game completion if match duration reached
    if (game.isPlaying) {
        game.triggerGameOver();
    }

    const totalShots = game.hits + game.misses;
    const accuracy = totalShots > 0 ? Math.round((game.hits / totalShots) * 100) : 100;

    console.log('\n-------------------------------------------------------------');
    console.log('🏁 MATCH FINISHED - TOURNAMENT TELEMETRY:');
    console.log(`  - Pilot Callsign:  ${selectedModel.name}`);
    console.log(`  - Final Score:     ${game.score}`);
    console.log(`  - Max Combo:       ${game.maxCombo}x`);
    console.log(`  - Targets Hit:     ${game.hits}`);
    console.log(`  - Combat Accuracy: ${accuracy}%`);
    console.log('-------------------------------------------------------------');

    // Automatically persist record to scores.json
    const scoresFile = path.join(__dirname, 'scores.json');
    let scores = [];
    try {
        if (fs.existsSync(scoresFile)) {
            scores = JSON.parse(fs.readFileSync(scoresFile, 'utf-8'));
        }
    } catch (e) {
        scores = [];
    }

    const newRecord = {
        id: `ai-${Date.now()}`,
        name: selectedModel.name,
        score: game.score,
        maxCombo: game.maxCombo,
        accuracy: accuracy,
        date: new Date().toISOString().split('T')[0]
    };

    scores.push(newRecord);
    scores.sort((a, b) => b.score - a.score || b.accuracy - a.accuracy);
    try {
        fs.writeFileSync(scoresFile, JSON.stringify(scores, null, 2), 'utf-8');
    } catch (e) {
        // Fallback gracefully if filesystem write permission is restricted in sandbox
    }

    const rank = scores.findIndex(s => s.id === newRecord.id) + 1;
    console.log(`\n🏆 ${selectedModel.name} successfully registered to CYBER_NET! Current Rank: #${rank}`);

    console.log('\n⚡ [CYBER_NET GLOBAL TOP 5 LEADERBOARD]:');
    scores.slice(0, 5).forEach((s, idx) => {
        const isCurrent = s.id === newRecord.id ? ' <-- (NEW AI RUN)' : '';
        console.log(`  #${idx + 1} ${s.name.padEnd(16, ' ')} Score: ${s.score.toString().padStart(5, ' ')} | Combo: ${s.maxCombo}x | Acc: ${s.accuracy}%${isCurrent}`);
    });
    console.log('=============================================================\n');
}

playTournamentMatch().catch(err => {
    console.error('Tournament match error:', err);
    process.exit(1);
});

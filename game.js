// ==========================================
// TYPING SHOOTER - MAIN ENGINE FACADE
// 模組聚合層：整合 constants, audio, a11y, ai-pilot, static-host 與 engine
// ==========================================

const {
    CHAR_SETS,
    DIFFICULTY_MULTIPLIER,
    getCharDifficulty,
    ALL_CHARS,
    SYMBOL_ANNOTATIONS,
    AI_MODELS,
    KEYBOARD_LAYOUT
} = typeof require !== 'undefined'
    ? require('./game/constants.js')
    : (window.TypingGameConstants || {});

const { AudioEngine } = typeof require !== 'undefined'
    ? require('./game/audio.js')
    : (window.TypingGameAudio || {});

const { A11yManager } = typeof require !== 'undefined'
    ? require('./game/a11y.js')
    : (window.TypingGameA11y || {});

const { AIPilot } = typeof require !== 'undefined'
    ? require('./game/ai-pilot.js')
    : (window.TypingGamePilot || {});

const { initStaticHostInterceptors } = typeof require !== 'undefined'
    ? require('./game/static-host.js')
    : (window.TypingGameStaticHost || {});

const { TypingGame } = typeof require !== 'undefined'
    ? require('./game/engine.js')
    : (window.TypingGameEngine || {});

// 頁面加載完成後實體化
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.game && typeof TypingGame === 'function') {
            window.game = new TypingGame();
        }
        if (typeof initStaticHostInterceptors === 'function') {
            initStaticHostInterceptors();
        }

        const urlParams = typeof window !== 'undefined' && window.location ? new URLSearchParams(window.location.search) : null;
        if (urlParams && urlParams.get('mode') === 'screenshot-battle' && window.game) {
            window.game.setupScreenshotScene();
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TypingGame,
        AI_MODELS,
        CHAR_SETS,
        DIFFICULTY_MULTIPLIER,
        getCharDifficulty,
        ALL_CHARS,
        SYMBOL_ANNOTATIONS,
        KEYBOARD_LAYOUT,
        AudioEngine,
        A11yManager,
        AIPilot,
        initStaticHostInterceptors
    };
}

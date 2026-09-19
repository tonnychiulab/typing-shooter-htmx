// ==========================================
// MAIN ENTRY POINT - 遊戲主進入點
// ES Module 根模組，負責初始化所有子系統
// ==========================================

import { TypingGame }               from './game/engine.js';
import { initStaticHostInterceptors } from './game/static-host.js';

document.addEventListener('DOMContentLoaded', () => {
    window.game = new TypingGame();
    initStaticHostInterceptors();

    // 截圖模式（供 README 截圖場景建構）
    const urlParams = window.location ? new URLSearchParams(window.location.search) : null;
    if (urlParams?.get('mode') === 'screenshot-battle') {
        window.game.setupScreenshotScene();
    }
});

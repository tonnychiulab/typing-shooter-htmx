(function () {
    class A11yManager {
        constructor(game) {
            this.game = game;
            this.isA11yMode = false;
            this.shields = 0;
            this.maxShields = 3;
            this.currentGuidedChar = null;

            this.a11yToggleBtn = document.getElementById('a11y-toggle-btn');
            this.a11yStatusLabel = document.getElementById('a11y-status-label');
            this.modalA11yBtn = document.getElementById('modal-a11y-toggle-btn');
            this.modalA11yLabel = document.getElementById('modal-a11y-label');
            this.shieldContainer = document.getElementById('shield-container');
            this.shieldDisplay = document.getElementById('shield-display');

            this.init();
        }

        init() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const savedA11y = localStorage.getItem('typing_defender_a11y');
                    if (savedA11y === 'true') {
                        this.setA11yMode(true);
                    }
                }
            } catch (e) {}

            if (this.a11yToggleBtn) {
                this.a11yToggleBtn.addEventListener('click', () => this.toggleA11yMode());
            }
            if (this.modalA11yBtn) {
                this.modalA11yBtn.addEventListener('click', () => this.toggleA11yMode());
            }
        }

        setA11yMode(enable) {
            this.isA11yMode = Boolean(enable);
            this.game.isA11yMode = this.isA11yMode;

            if (typeof document !== 'undefined' && document.body) {
                if (this.isA11yMode) {
                    document.body.classList.add('a11y-big-font');
                } else {
                    document.body.classList.remove('a11y-big-font');
                }
            }

            const text = this.isA11yMode ? '開啟' : '關閉';
            if (this.a11yStatusLabel) this.a11yStatusLabel.textContent = text;
            if (this.modalA11yLabel) this.modalA11yLabel.textContent = text;

            if (!this.isA11yMode) {
                this.clearKeyGuideLight();
            }

            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('typing_defender_a11y', this.isA11yMode ? 'true' : 'false');
                }
            } catch (e) {}
        }

        toggleA11yMode() {
            this.setA11yMode(!this.isA11yMode);
        }

        resetForNewGame() {
            if (this.isA11yMode) {
                this.game.maxBombs = 3;
                this.game.bombs = 3;
                this.shields = 3;
                if (this.shieldContainer) this.shieldContainer.style.display = 'flex';
                if (this.game.bombSlot3) this.game.bombSlot3.style.display = 'inline-flex';
            } else {
                this.game.maxBombs = 2;
                this.game.bombs = 0;
                this.shields = 0;
                if (this.shieldContainer) this.shieldContainer.style.display = 'none';
                if (this.game.bombSlot3) this.game.bombSlot3.style.display = 'none';
            }
            this.game.shields = this.shields;
            this.updateShieldUI();
            this.clearKeyGuideLight();
        }

        updateShieldUI() {
            if (this.shieldDisplay) {
                this.shieldDisplay.textContent = `🛡️ ${this.shields}`;
                this.shieldDisplay.style.opacity = this.shields > 0 ? '1' : '0.4';
            }
        }

        absorbBreachWithShield() {
            if (this.shields > 0) {
                this.shields--;
                this.game.shields = this.shields;
                this.updateShieldUI();
                return true;
            }
            return false;
        }

        clearKeyGuideLight() {
            if (this.currentGuidedChar && this.game.charToKeyMap) {
                const entry = this.game.charToKeyMap.get(this.currentGuidedChar);
                if (entry && entry.element) {
                    entry.element.classList.remove('vkey-guided');
                }
                if (this.game.shiftKeyElements) {
                    this.game.shiftKeyElements.forEach(shiftEl => {
                        shiftEl.classList.remove('vkey-guided-shift');
                    });
                }
                this.currentGuidedChar = null;
                this.game.currentGuidedChar = null;
            }
        }

        updateKeyGuideLight() {
            if (!this.isA11yMode || this.game.isAiPilot || !this.game.isPlaying || this.game.targets.length === 0) {
                this.clearKeyGuideLight();
                return;
            }

            let closestTarget = null;
            let maxY = -Infinity;
            for (const t of this.game.targets) {
                if (t.y > maxY) {
                    maxY = t.y;
                    closestTarget = t;
                }
            }

            if (!closestTarget) {
                this.clearKeyGuideLight();
                return;
            }

            const targetChar = closestTarget.char;
            if (this.currentGuidedChar === targetChar) return;

            this.clearKeyGuideLight();
            this.currentGuidedChar = targetChar;
            this.game.currentGuidedChar = targetChar;

            const entry = this.game.charToKeyMap ? this.game.charToKeyMap.get(targetChar) : null;
            if (entry && entry.element) {
                entry.element.classList.add('vkey-guided');
                if (entry.isShift && this.game.shiftKeyElements) {
                    this.game.shiftKeyElements.forEach(shiftEl => {
                        shiftEl.classList.add('vkey-guided-shift');
                    });
                }
            }
        }
    }

    const exportsObj = { A11yManager };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exportsObj;
    }
    if (typeof window !== 'undefined') {
        window.TypingGameA11y = exportsObj;
    }
})();


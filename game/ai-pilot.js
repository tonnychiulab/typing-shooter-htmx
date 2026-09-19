(function () {
    const { AI_MODELS } = typeof require !== 'undefined'
        ? require('./constants.js')
        : (window.TypingGameConstants || {});

    class AIPilot {
        constructor(game) {
            this.game = game;
            this.isAiPilot = false;
            this.currentAiModelKey = 'veteran';
            this.aiTimer = null;
            this.aiIsExecuting = false;
            this.lockedTargetId = null;

            this.aiToggleBtn = document.getElementById('ai-toggle-btn');
            this.aiStatusLabel = document.getElementById('ai-status-label');
            this.aiModelSelect = document.getElementById('ai-model-select');
            this.aiLaunchBtn = document.getElementById('ai-launch-btn');
            this.aiDecisionDisplay = document.getElementById('ai-decision-display');
            this.aiGazeReticle = document.getElementById('ai-gaze-reticle');

            this.init();
        }

        init() {
            if (this.aiToggleBtn) {
                this.aiToggleBtn.addEventListener('click', () => this.toggleAiPilot());
            }
            if (this.aiModelSelect) {
                this.aiModelSelect.addEventListener('change', (e) => {
                    this.currentAiModelKey = e.target.value;
                    this.game.currentAiModelKey = this.currentAiModelKey;
                    if (this.isAiPilot && this.game.isPlaying) {
                        this.restartAiLoop();
                    }
                });
            }
            if (this.aiLaunchBtn) {
                this.aiLaunchBtn.addEventListener('click', () => {
                    this.toggleAiPilot(true);
                    this.game.startGame();
                });
            }
        }

        toggleAiPilot(forceState = null) {
            this.isAiPilot = forceState !== null ? forceState : !this.isAiPilot;
            this.game.isAiPilot = this.isAiPilot;
            this.updateAiUI();

            if (this.isAiPilot) {
                if (this.game.isPlaying) {
                    this.startAiLoop();
                }
            } else {
                this.stopAiLoop();
                this.clearGaze();
                this.clearTargetLock();
                if (this.aiDecisionDisplay) {
                    this.aiDecisionDisplay.textContent = '副駕駛待命中';
                }
            }
        }

        startAiLoop() {
            this.stopAiLoop();
            const model = AI_MODELS[this.currentAiModelKey] || AI_MODELS.veteran;
            this.aiTimer = setInterval(() => this.aiThinkAndAct(), model.scanInterval);
            this.game.aiTimer = this.aiTimer;
        }

        stopAiLoop() {
            if (this.aiTimer) {
                clearInterval(this.aiTimer);
                this.aiTimer = null;
                this.game.aiTimer = null;
            }
            this.aiIsExecuting = false;
            this.game.aiIsExecuting = false;
            this.clearTargetLock();
            this.clearGaze();
        }

        restartAiLoop() {
            this.stopAiLoop();
            this.startAiLoop();
        }

        updateAiUI() {
            const active = this.isAiPilot;
            if (this.aiToggleBtn && this.aiToggleBtn.classList) {
                if (active) {
                    this.aiToggleBtn.classList.add('active');
                } else {
                    this.aiToggleBtn.classList.remove('active');
                }
            }
            if (this.aiStatusLabel) {
                this.aiStatusLabel.textContent = active ? '運作中' : '已關閉';
            }
            if (this.aiModelSelect) {
                this.aiModelSelect.value = this.currentAiModelKey;
            }
        }

        moveAiGazeTo(keyChar, isShift = false) {
            if (!this.game.virtualKeyboard || !this.aiGazeReticle) return;

            const entry = this.game.charToKeyMap ? this.game.charToKeyMap.get(keyChar) : null;
            if (!entry || !entry.element) return;

            const keyEl = entry.element;
            const kbRect = this.game.virtualKeyboard.getBoundingClientRect();
            const keyRect = keyEl.getBoundingClientRect();

            const x = keyRect.left - kbRect.left + (keyRect.width / 2);
            const y = keyRect.top - kbRect.top + (keyRect.height / 2);

            this.aiGazeReticle.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
            this.aiGazeReticle.classList.remove('hidden');

            const labelEl = this.aiGazeReticle.querySelector('.reticle-label');
            if (labelEl) {
                labelEl.textContent = `AI 視線: [${keyChar}]`;
            }

            const gazedKeys = this.game.virtualKeyboard.querySelectorAll ? this.game.virtualKeyboard.querySelectorAll('.vkey-gazed') : [];
            if (gazedKeys && gazedKeys.forEach) {
                gazedKeys.forEach(k => k.classList.remove('vkey-gazed'));
            }
            keyEl.classList.add('vkey-gazed');

            if (this.game.shiftKeyElements) {
                this.game.shiftKeyElements.forEach(s => {
                    if (isShift) s.classList.add('vkey-active-shift');
                    else s.classList.remove('vkey-active-shift');
                });
            }
        }

        clearGaze() {
            if (this.aiGazeReticle) this.aiGazeReticle.classList.add('hidden');
            if (this.game.virtualKeyboard) {
                const gazed = this.game.virtualKeyboard.querySelectorAll ? this.game.virtualKeyboard.querySelectorAll('.vkey-gazed, .vkey-active-shift') : [];
                if (gazed && gazed.forEach) {
                    gazed.forEach(k => k.classList.remove('vkey-gazed', 'vkey-active-shift'));
                }
            }
        }

        clearTargetLock() {
            if (this.lockedTargetId) {
                const el = document.getElementById(this.lockedTargetId);
                if (el) el.classList.remove('ai-locked-target');
                this.lockedTargetId = null;
                this.game.lockedTargetId = null;
            }
        }

        aiThinkAndAct() {
            if (!this.game.isPlaying || !this.isAiPilot || this.aiIsExecuting) return;

            if (this.game.targets.length === 0) {
                this.clearTargetLock();
                this.clearGaze();
                if (this.aiGazeReticle) this.aiGazeReticle.classList.add('hidden');
                if (this.aiDecisionDisplay) this.aiDecisionDisplay.textContent = '搜尋天際目標中...';
                return;
            }

            const model = AI_MODELS[this.currentAiModelKey] || AI_MODELS.veteran;

            let bestTarget = null;
            let highestThreat = -Infinity;

            for (const target of this.game.targets) {
                const threat = target.y + (target.speed * 2.5);
                if (threat > highestThreat) {
                    highestThreat = threat;
                    bestTarget = target;
                }
            }

            if (!bestTarget) return;

            // AI 智慧施放大招判定
            if (this.game.bombs > 0 && this.game.battlefield) {
                const fieldHeight = this.game.battlefield.clientHeight - 40;
                const isCrowded = this.game.targets.length >= model.empCrowdThreshold;
                const isEmergency = bestTarget && (bestTarget.y >= fieldHeight - model.empDangerZone);
                if (isCrowded || isEmergency) {
                    if (this.aiDecisionDisplay) {
                        this.aiDecisionDisplay.textContent = '⚡ 緊急狀況：AI 啟動 EMP 核彈！';
                    }
                    this.game.triggerEmpBomb();
                    return;
                }
            }

            // 更新視覺鎖定框
            if (this.lockedTargetId !== bestTarget.id) {
                this.clearTargetLock();
                bestTarget.element.classList.add('ai-locked-target');
                this.lockedTargetId = bestTarget.id;
                this.game.lockedTargetId = bestTarget.id;
            }

            const fieldHeight = this.game.battlefield ? this.game.battlefield.clientHeight - 40 : 500;
            const remainingDistance = Math.max(0, fieldHeight - bestTarget.y);
            const etaSeconds = (remainingDistance / Math.max(bestTarget.speed, 1)).toFixed(1);

            if (this.aiDecisionDisplay) {
                this.aiDecisionDisplay.textContent = `鎖定目標 [${bestTarget.char}] 墜落倒數: ${etaSeconds}秒`;
            }

            const targetEntry = this.game.charToKeyMap ? this.game.charToKeyMap.get(bestTarget.char) : null;
            const isShiftNeeded = targetEntry ? targetEntry.isShift : false;
            this.moveAiGazeTo(bestTarget.char, isShiftNeeded);

            const reactionDelay = Math.random() * (model.maxDelay - model.minDelay) + model.minDelay;

            this.aiIsExecuting = true;
            this.game.aiIsExecuting = true;

            setTimeout(() => {
                if (!this.game.isPlaying || !this.isAiPilot) {
                    this.aiIsExecuting = false;
                    this.game.aiIsExecuting = false;
                    return;
                }

                const targetStillExists = this.game.targets.some(t => t.id === bestTarget.id);
                if (!targetStillExists) {
                    this.aiIsExecuting = false;
                    this.game.aiIsExecuting = false;
                    this.clearTargetLock();
                    return;
                }

                const hitRoll = Math.random();
                const willHit = hitRoll <= model.accuracy;

                if (willHit) {
                    this.game.handleKeyInput(bestTarget.char);
                } else {
                    const miskey = 'x';
                    this.game.handleKeyInput(miskey);
                    if (this.aiDecisionDisplay) {
                        this.aiDecisionDisplay.textContent = `⚠️ AI 失誤手滑: 按到 [${miskey}]`;
                    }
                }

                this.aiIsExecuting = false;
                this.game.aiIsExecuting = false;
            }, reactionDelay);
        }
    }

    const exportsObj = { AIPilot };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exportsObj;
    }
    if (typeof window !== 'undefined') {
        window.TypingGamePilot = exportsObj;
    }
})();


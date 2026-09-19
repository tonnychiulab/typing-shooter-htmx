// ==========================================
// STATIC HOST & OFFLINE LEADERBOARD INTERCEPTORS
// 支援 GitHub Pages (純靜態託管) 與離線本機備援榜單
// ==========================================

const CLIENT_STORAGE_KEY = 'typing_defender_scores';

const INITIAL_CLIENT_SCORES = [
    { id: 'p-1', name: 'NEO_CYPHER', score: 3850, maxCombo: 42, accuracy: 98 },
    { id: 'p-2', name: 'GHOST_01',   score: 2980, maxCombo: 31, accuracy: 95 },
    { id: 'p-3', name: 'TRINITY',    score: 2420, maxCombo: 28, accuracy: 92 },
    { id: 'p-4', name: 'ZERO_COOL',  score: 1890, maxCombo: 22, accuracy: 89 },
    { id: 'p-5', name: 'ACID_BURN',  score: 1450, maxCombo: 18, accuracy: 86 }
];

function getClientScores() {
    try {
        if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem(CLIENT_STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        }
    } catch (e) {}
    return [...INITIAL_CLIENT_SCORES];
}

function saveClientScores(scores) {
    try {
        if (typeof localStorage !== 'undefined') {
            const sorted = [...scores].sort((a, b) => b.score - a.score || b.accuracy - a.accuracy).slice(0, 50);
            localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(sorted));
        }
    } catch (e) {}
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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

        return `
            <tr ${isNew}>
                <td class="rank-col"><span class="rank-badge ${rankBadgeClass}">#${rank}</span></td>
                <td class="name-col">${escapeHtml(entry.name)}</td>
                <td class="score-col">${(entry.score || 0).toLocaleString()}</td>
                <td class="combo-col">${entry.maxCombo || 0}x</td>
                <td class="accuracy-col">${entry.accuracy || 100}%</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="leaderboard-card">
            <div class="leaderboard-header">
                <span class="leaderboard-tag">CYBER_NET // 前十強防衛英雄榜 (靜態本地雲端)</span>
                <span class="leaderboard-status-dot"></span>
            </div>
            <div class="leaderboard-table-container">
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th class="rank-col">排名</th>
                            <th class="name-col">駕駛呼號</th>
                            <th class="score-col">得分</th>
                            <th class="combo-col">連擊</th>
                            <th class="accuracy-col">命中率</th>
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
             window.location.protocol === 'file:');

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

    document.body.addEventListener('htmx:responseError', (evt) => {
        const detail = evt.detail;
        if (detail && detail.path && detail.path.includes('/api/leaderboard') && detail.target) {
            const scores = getClientScores();
            detail.target.innerHTML = renderClientLeaderboardHtml(scores);
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initStaticHostInterceptors,
        getClientScores,
        saveClientScores,
        renderClientLeaderboardHtml
    };
}
if (typeof window !== 'undefined') {
    window.TypingGameStaticHost = {
        initStaticHostInterceptors,
        getClientScores,
        saveClientScores,
        renderClientLeaderboardHtml
    };
}


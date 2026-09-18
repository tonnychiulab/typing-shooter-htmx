const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 3000;
const SCORES_FILE = path.join(__dirname, 'scores.json');

// 初始模擬排行榜紀錄（如果 scores.json 不存在時自動產生）
const INITIAL_SCORES = [
    { id: 'pilot-1', name: 'NEO_CYPHER', score: 3850, maxCombo: 42, accuracy: 98, date: '2026-09-15' },
    { id: 'pilot-2', name: 'GHOST_01', score: 2980, maxCombo: 31, accuracy: 95, date: '2026-09-16' },
    { id: 'pilot-3', name: 'TRINITY', score: 2420, maxCombo: 28, accuracy: 92, date: '2026-09-17' },
    { id: 'pilot-4', name: 'ZERO_COOL', score: 1890, maxCombo: 22, accuracy: 89, date: '2026-09-17' },
    { id: 'pilot-5', name: 'ACID_BURN', score: 1450, maxCombo: 18, accuracy: 86, date: '2026-09-18' }
];

let memoryScores = null;

function loadScores() {
    if (memoryScores) return memoryScores;
    try {
        if (fs.existsSync(SCORES_FILE)) {
            const data = fs.readFileSync(SCORES_FILE, 'utf-8');
            memoryScores = JSON.parse(data);
            return memoryScores;
        }
        memoryScores = [...INITIAL_SCORES];
        fs.writeFileSync(SCORES_FILE, JSON.stringify(INITIAL_SCORES, null, 2), 'utf-8');
    } catch (err) {
        if (!memoryScores) memoryScores = [...INITIAL_SCORES];
    }
    return memoryScores;
}

function saveScores(scores) {
    memoryScores = scores;
    try {
        fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf-8');
    } catch (err) {
        // Fallback to in-memory persistence if filesystem is restricted
    }
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

// 產生排行榜 HTML 片段 (HTMX server-rendered component)
function renderLeaderboardHtml(scores, highlightedId = null) {
    // 排序：分數高至低，同分比命中率
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
                <td class="score-col">${entry.score.toLocaleString()}</td>
                <td class="combo-col">${entry.maxCombo}x</td>
                <td class="accuracy-col">${entry.accuracy}%</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="leaderboard-card">
            <div class="leaderboard-header">
                <span class="leaderboard-tag">CYBER_NET // TOP 10 PILOTS</span>
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

// MIME 類型對應
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // API: 取得排行榜 HTML
    if (req.method === 'GET' && pathname === '/api/leaderboard') {
        const scores = loadScores();
        const html = renderLeaderboardHtml(scores);
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
        });
        return res.end(html);
    }

    // API: 提交新分數
    if (req.method === 'POST' && pathname === '/api/score') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1e6) req.destroy(); // 防範過大 payload
        });

        req.on('end', () => {
            let name = 'ROOKIE';
            let score = 0;
            let maxCombo = 0;
            let accuracy = 100;

            if (req.headers['content-type']?.includes('application/json')) {
                try {
                    const data = JSON.parse(body);
                    name = data.name || name;
                    score = parseInt(data.score, 10) || 0;
                    maxCombo = parseInt(data.maxCombo, 10) || 0;
                    accuracy = parseInt(data.accuracy, 10) || 0;
                } catch (e) {
                    console.error('Error parsing JSON score body:', e);
                }
            } else {
                // HTMX 預設以 x-www-form-urlencoded 提交 form
                const params = new URLSearchParams(body);
                name = params.get('name') || name;
                score = parseInt(params.get('score'), 10) || 0;
                maxCombo = parseInt(params.get('maxCombo'), 10) || 0;
                accuracy = parseInt(params.get('accuracy'), 10) || 0;
            }

            // 清理輸入
            name = name.trim().slice(0, 20).toUpperCase() || 'ANONYMOUS';
            const newId = `rec-${Date.now()}`;
            const newRecord = {
                id: newId,
                name: name,
                score: Math.max(0, score),
                maxCombo: Math.max(0, maxCombo),
                accuracy: Math.min(100, Math.max(0, accuracy)),
                date: new Date().toISOString().split('T')[0]
            };

            const scores = loadScores();
            scores.push(newRecord);
            saveScores(scores);

            // 直接回傳最新包含高亮的排行榜 HTML 片段，由 HTMX 直接 swap 置換
            const html = renderLeaderboardHtml(scores, newId);
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache'
            });
            return res.end(html);
        });
        return;
    }

    // 靜態檔案伺服
    let filePath = pathname === '/' ? '/index.html' : pathname;
    const safePath = path.normalize(path.join(__dirname, filePath));

    // 安全檢查避免路徑遍歷
    if (!safePath.startsWith(__dirname)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    fs.readFile(safePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Not Found');
        }

        const ext = path.extname(safePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`\n==============================================`);
        console.log(`🚀 Typing Defender HTMX Server is running!`);
        console.log(`📡 URL: http://localhost:${PORT}`);
        console.log(`==============================================\n`);
    });
}

module.exports = server;


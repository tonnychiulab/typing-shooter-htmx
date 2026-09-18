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
                <span class="leaderboard-tag">CYBER_NET // 前十強防衛英雄榜</span>
                <span class="leaderboard-status-dot"></span>
            </div>
            <div class="leaderboard-table-container">
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th>排名</th>
                            <th>駕駛呼號</th>
                            <th>得分</th>
                            <th>最高連擊</th>
                            <th>命中率</th>
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

// 允許被存取的靜態檔案白名單（防止存取 server.js, scores.json, .git 等敏感檔案）
const ALLOWED_STATIC_FILES = new Set([
    '/index.html',
    '/style.css',
    '/game.js',
    '/favicon.ico'
]);

// 簡易防刷防洪機制 (每個 IP 1.5 秒內限送 1 次戰績)
const recentSubmissions = new Map();

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    const clientIp = req.socket?.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';

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
        // 防刷頻檢查
        const now = Date.now();
        const lastTime = recentSubmissions.get(clientIp) || 0;
        if (now - lastTime < 1200) {
            res.writeHead(429, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end('<p style="color: var(--accent-red); padding: 10px;">⚠️ 提交過於頻繁，請稍後再試</p>');
        }
        recentSubmissions.set(clientIp, now);

        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 50000) req.destroy(); // 嚴格限制 payload 50KB
        });

        req.on('end', () => {
            let rawName = 'ROOKIE';
            let score = 0;
            let maxCombo = 0;
            let accuracy = 100;

            if (req.headers['content-type']?.includes('application/json')) {
                try {
                    const data = JSON.parse(body);
                    rawName = String(data.name || '');
                    score = parseInt(data.score, 10) || 0;
                    maxCombo = parseInt(data.maxCombo, 10) || 0;
                    accuracy = parseInt(data.accuracy, 10) || 0;
                } catch (e) {
                    // JSON 解析錯誤時保留預設值
                }
            } else {
                const params = new URLSearchParams(body);
                rawName = params.get('name') || '';
                score = parseInt(params.get('score'), 10) || 0;
                maxCombo = parseInt(params.get('maxCombo'), 10) || 0;
                accuracy = parseInt(params.get('accuracy'), 10) || 0;
            }

            // 嚴格過濾與白名單校驗：
            // 1. 暱稱：僅允許英數、底線、減號與空格，最多 16 碼，移除所有潛在危險字元
            const sanitizedName = rawName.toUpperCase().replace(/[^A-Z0-9_ -]/g, '').trim().slice(0, 16) || 'ANONYMOUS';

            // 2. 數值範圍合理性保護（防止作弊直接送出百億異常值）
            const safeScore = Math.min(500000, Math.max(0, score));
            const safeCombo = Math.min(5000, Math.max(0, maxCombo));
            const safeAccuracy = Math.min(100, Math.max(0, accuracy));

            const newId = `rec-${Date.now()}`;
            const newRecord = {
                id: newId,
                name: sanitizedName,
                score: safeScore,
                maxCombo: safeCombo,
                accuracy: safeAccuracy,
                date: new Date().toISOString().split('T')[0]
            };

            let scores = loadScores();
            scores.push(newRecord);
            scores.sort((a, b) => b.score - a.score || b.accuracy - a.accuracy);

            // 限制最多儲存 Top 100 筆，防止硬碟空間與記憶體遭 DoS 膨脹
            if (scores.length > 100) {
                scores = scores.slice(0, 100);
            }
            saveScores(scores);

            // 直接回傳最新包含高亮的排行榜 HTML 片段
            const html = renderLeaderboardHtml(scores, newId);
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache'
            });
            return res.end(html);
        });
        return;
    }

    // 靜態檔案伺服安全控管：路徑對齊
    let reqPath = pathname === '/' ? '/index.html' : pathname;

    // 封鎖所有隱藏檔案（如 .git, .env 等）與非白名單檔案
    if (!ALLOWED_STATIC_FILES.has(reqPath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('403 Forbidden: Access restricted to public assets.');
    }

    const safePath = path.join(__dirname, reqPath);

    fs.readFile(safePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Not Found');
        }

        const ext = path.extname(safePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY'
        });
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


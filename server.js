const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 3000;
const SCORES_FILE = path.join(__dirname, 'scores.json');

// scores.json Schema 版本（升版時遞增，loadScores 會自動 migrate 舊資料）
const SCORES_SCHEMA_VERSION = 2;

// 初始模擬排行榜紀錄（如果 scores.json 不存在時自動產生）
// v2 新增欄位：played_at (ISO timestamp)、duration_s (遊戲秒數)
const INITIAL_RECORDS = [
    { id: 'pilot-1', name: 'NEO_CYPHER', score: 3850, maxCombo: 42, accuracy: 98, duration_s: 187, played_at: '2026-09-15T14:22:10.000Z' },
    { id: 'pilot-2', name: 'GHOST_01',   score: 2980, maxCombo: 31, accuracy: 95, duration_s: 152, played_at: '2026-09-16T09:45:33.000Z' },
    { id: 'pilot-3', name: 'TRINITY',    score: 2420, maxCombo: 28, accuracy: 92, duration_s: 124, played_at: '2026-09-17T18:01:05.000Z' },
    { id: 'pilot-4', name: 'ZERO_COOL',  score: 1890, maxCombo: 22, accuracy: 89, duration_s: 98,  played_at: '2026-09-17T20:33:47.000Z' },
    { id: 'pilot-5', name: 'ACID_BURN',  score: 1450, maxCombo: 18, accuracy: 86, duration_s: 76,  played_at: '2026-09-18T11:17:22.000Z' }
];

/**
 * 將舊版 v1（純陣列）或缺欄位記錄遷移至 v2 格式
 * - v1 純陣列 → 包入 { version, updated_at, records } wrapper
 * - 舊記錄缺少 played_at → 以 date 欄位補填
 * - 舊記錄缺少 duration_s → 填 0（未知）
 */
function migrateRecords(raw) {
    let records;
    if (Array.isArray(raw)) {
        // v1 格式：直接是陣列
        records = raw;
    } else if (raw && Array.isArray(raw.records)) {
        // v2+ 格式
        records = raw.records;
    } else {
        return [...INITIAL_RECORDS];
    }

    return records.map(r => ({
        id:         r.id         || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name:       r.name       || 'ANONYMOUS',
        score:      r.score      ?? 0,
        maxCombo:   r.maxCombo   ?? 0,
        accuracy:   r.accuracy   ?? 0,
        duration_s: r.duration_s ?? 0,
        played_at:  r.played_at  || (r.date ? `${r.date}T00:00:00.000Z` : new Date().toISOString())
    }));
}

/** 組裝完整的 scores.json 包裹物件 */
function buildScoresFile(records) {
    return {
        version:    SCORES_SCHEMA_VERSION,
        updated_at: new Date().toISOString(),
        records
    };
}

let memoryScores = null; // 快取，存 records 陣列

function loadScores() {
    if (memoryScores) return memoryScores;
    try {
        if (fs.existsSync(SCORES_FILE)) {
            const raw = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf-8'));
            memoryScores = migrateRecords(raw);
            // 若讀入的是舊版，嘗試回寫 v2 格式（如檔案系統受限則靜默降級至記憶體）
            if (!raw.version || raw.version < SCORES_SCHEMA_VERSION) {
                try {
                    fs.writeFileSync(SCORES_FILE, JSON.stringify(buildScoresFile(memoryScores), null, 2), 'utf-8');
                } catch (writeErr) {
                    // 檔案系統受限環境（如沙盒）直接以記憶體快取維護
                }
            }
            return memoryScores;
        }
        memoryScores = [...INITIAL_RECORDS];
        fs.writeFileSync(SCORES_FILE, JSON.stringify(buildScoresFile(memoryScores), null, 2), 'utf-8');
    } catch (err) {
        if (!memoryScores) memoryScores = [...INITIAL_RECORDS];
    }
    return memoryScores;
}

function saveScores(records) {
    memoryScores = records;
    try {
        fs.writeFileSync(SCORES_FILE, JSON.stringify(buildScoresFile(records), null, 2), 'utf-8');
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

// MIME 類型對應
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json'
};

// 允許被存取的靜態檔案白名單（防止存取 server.js, scores.json, .git 等敏感檔案）
const ALLOWED_STATIC_FILES = new Set([
    '/index.html',
    '/style.css',
    '/game.js',
    '/main.js',
    '/game/constants.js',
    '/game/audio.js',
    '/game/a11y.js',
    '/game/ai-pilot.js',
    '/game/static-host.js',
    '/game/engine.js',
    '/sw.js',
    '/manifest.json',
    '/favicon.ico',
    '/assets/icon-192.jpg',
    '/assets/icon-512.jpg',
    '/assets/screenshot-start.png',
    '/assets/screenshot-gameplay.png'
]);

// 簡易防刷防洪機制 (每個 IP 1.5 秒內限送 1 次戰績)
// TTL: 超過 SUBMISSION_TTL_MS 的記錄於每次請求時清理，防止 Map 無限成長
const recentSubmissions = new Map();
const SUBMISSION_COOLDOWN_MS = 1200;
const SUBMISSION_TTL_MS = 10 * 60 * 1000; // 10 分鐘後清理過期 IP 紀錄

function purgeExpiredSubmissions() {
    const cutoff = Date.now() - SUBMISSION_TTL_MS;
    for (const [ip, ts] of recentSubmissions) {
        if (ts < cutoff) recentSubmissions.delete(ip);
    }
}

// 每 5 分鐘自動清理一次過期紀錄（防止長時間運行記憶體漸漲）
setInterval(purgeExpiredSubmissions, 5 * 60 * 1000).unref?.();

// 安全 Response Header（CSP、防點擊劫持、防 MIME 嗅探）
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://unpkg.com",  // htmx CDN
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self'",
        "img-src 'self' data:",
        "font-src 'none'",
        "object-src 'none'",
        "base-uri 'self'"
    ].join('; ')
};

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
        if (now - lastTime < SUBMISSION_COOLDOWN_MS) {
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
            let durationS = 0;

            if (req.headers['content-type']?.includes('application/json')) {
                try {
                    const data = JSON.parse(body);
                    rawName   = String(data.name || '');
                    score     = parseInt(data.score, 10) || 0;
                    maxCombo  = parseInt(data.maxCombo, 10) || 0;
                    accuracy  = parseInt(data.accuracy, 10) || 0;
                    durationS = parseInt(data.duration_s, 10) || 0;
                } catch (e) {
                    // JSON 解析錯誤時保留預設值
                }
            } else {
                const params = new URLSearchParams(body);
                rawName   = params.get('name') || '';
                score     = parseInt(params.get('score'), 10) || 0;
                maxCombo  = parseInt(params.get('maxCombo'), 10) || 0;
                accuracy  = parseInt(params.get('accuracy'), 10) || 0;
                durationS = parseInt(params.get('duration_s'), 10) || 0;
            }

            // 嚴格過濾與白名單校驗：
            // 1. 暱稱：僅允許英數、底線、減號與空格，最多 16 碼，移除所有潛在危險字元
            const sanitizedName = rawName.toUpperCase().replace(/[^A-Z0-9_ -]/g, '').trim().slice(0, 16) || 'ANONYMOUS';

            // 2. 數值範圍合理性保護（防止作弊直接送出百億異常值）
            const safeScore    = Math.min(500000, Math.max(0, score));
            const safeCombo    = Math.min(5000,   Math.max(0, maxCombo));
            const safeAccuracy = Math.min(100,    Math.max(0, accuracy));
            const safeDuration = Math.min(86400,  Math.max(0, durationS)); // 上限 24 小時

            const newId = `rec-${Date.now()}`;
            const newRecord = {
                id:         newId,
                name:       sanitizedName,
                score:      safeScore,
                maxCombo:   safeCombo,
                accuracy:   safeAccuracy,
                duration_s: safeDuration,
                played_at:  new Date().toISOString()
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
            ...SECURITY_HEADERS
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

server.loadScores = loadScores;
server.saveScores = saveScores;
server.migrateRecords = migrateRecords;
server.buildScoresFile = buildScoresFile;
server.SCORES_SCHEMA_VERSION = SCORES_SCHEMA_VERSION;

module.exports = server;

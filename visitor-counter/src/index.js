// 作品集頁尾的訪客計數器（Cloudflare Worker + D1）
// POST /hit：記一次造訪並回傳最新數字；GET /stats：只讀取數字。
// 只記每天的總數，不存 IP、cookie 或任何能辨識訪客的資料。

const SITE_ORIGIN = 'https://jianhuanglyu.github.io';
const BOT_AGENT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|python|curl|wget/i;

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
};

// 台灣沒有日光節約時間，固定 UTC+8 即可在半夜 12 點換日
export function taipeiDate(now = Date.now()) {
    return new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function reply(body, status = 200) {
    return new Response(body === null ? null : JSON.stringify(body), { status, headers: HEADERS });
}

// 只有從作品集網站送來、看起來不像機器人的請求才計數；本機預覽、其他網站或爬蟲只讀數字
function countable(request) {
    return request.headers.get('Origin') === SITE_ORIGIN && !BOT_AGENT.test(request.headers.get('User-Agent') || '');
}

export default {
    async fetch(request, env) {
        const { pathname } = new URL(request.url);
        if (request.method === 'OPTIONS') return reply(null, 204);

        const hit = pathname === '/hit' && request.method === 'POST';
        const stats = pathname === '/stats' && request.method === 'GET';
        if (!hit && !stats) return reply({ error: 'not found' }, 404);

        const day = taipeiDate();
        const read = env.DB.prepare(
            'SELECT COALESCE(SUM(count), 0) AS total, COALESCE(SUM(CASE WHEN day = ?1 THEN count END), 0) AS today FROM daily_visits'
        ).bind(day);

        let row;
        if (hit && countable(request)) {
            const add = env.DB.prepare(
                'INSERT INTO daily_visits (day, count) VALUES (?1, 1) ON CONFLICT (day) DO UPDATE SET count = count + 1'
            ).bind(day);
            const [, result] = await env.DB.batch([add, read]);
            row = result.results[0];
        } else {
            row = await read.first();
        }
        return reply({ day, today: row.today, total: row.total });
    },
};

// GET /api/leads —— 后台读取全部线索 + 统计（需 X-Admin-Password）
export async function onRequestGet(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
    'Content-Type': 'application/json; charset=utf-8',
  };
  const pwd = request.headers.get('x-admin-password') || '';
  if (!env.ADMIN_PASSWORD || pwd !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ ok: false, error: '未登录' }), { status: 401, headers: cors });
  }
  let arr = [];
  try {
    const raw = await env.LEADS.get('leads');
    if (raw) arr = JSON.parse(raw);
    if (!Array.isArray(arr)) arr = [];
  } catch (e) { arr = []; }
  arr = arr.slice().sort((a, b) => (b.id || 0) - (a.id || 0));

  const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const now = Date.now();
  const stats = { today: 0, week: 0, month: 0, untouched: 0, trial: 0, whitepaper: 0 };
  for (const l of arr) {
    if ((l.time || '').startsWith(today)) stats.today++;
    if (now - (l.id || 0) < 7 * 86400 * 1000) stats.week++;
    if (now - (l.id || 0) < 30 * 86400 * 1000) stats.month++;
    if (l.status === '未联系') stats.untouched++;
    const src = (l.source || '') + (l.course || '');
    if (src.includes('试听')) stats.trial++;
    if (src.includes('白皮书')) stats.whitepaper++;
  }
  return new Response(JSON.stringify({ ok: true, leads: arr, stats }), { status: 200, headers: cors });
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': context.request.headers.get('origin') || '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
    },
  });
}

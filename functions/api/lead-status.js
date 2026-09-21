// POST /api/lead-status —— 修改线索跟进状态（需 X-Admin-Password）
export async function onRequestPost(context) {
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
  try {
    const body = await request.json();
    const lid = String(body.id);
    const status = body.status || '';
    let arr = [];
    try {
      const raw = await env.LEADS.get('leads');
      if (raw) arr = JSON.parse(raw);
      if (!Array.isArray(arr)) arr = [];
    } catch (e) { arr = []; }
    let changed = false;
    for (const l of arr) {
      if (String(l.id) === lid) { l.status = status; changed = true; break; }
    }
    if (changed) await env.LEADS.put('leads', JSON.stringify(arr));
    return new Response(JSON.stringify({ ok: changed }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: '参数错误' }), { status: 400, headers: cors });
  }
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

// Cloudflare Pages Function：家长在前台提交表单，先存 KV 再调 Server酱
// 路由：POST /api/lead
export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('origin') || '*';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    const phone = (body.phone || '').trim();
    if (!name || !/^1\d{10}$/.test(phone)) {
      return new Response(JSON.stringify({ ok: false, error: '请填写姓名和正确的手机号' }), { status: 400, headers: cors });
    }
    const lead = {
      id: Date.now(),
      name,
      phone,
      wechat: (body.wechat || '').trim(),
      grade: (body.grade || '').trim(),
      course: (body.course || '').trim(),
      message: (body.message || '').trim(),
      source: (body.source || '官网表单').trim(),
      time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      status: '未联系',
    };

    // 1) 存 KV
    let arr = [];
    try {
      const raw = await env.LEADS.get('leads');
      if (raw) arr = JSON.parse(raw);
      if (!Array.isArray(arr)) arr = [];
    } catch (e) { arr = []; }
    arr.push(lead);
    await env.LEADS.put('leads', JSON.stringify(arr));

    // 2) 异步发 Server酱（不阻塞响应）
    try {
      const key = env.SERVERCHAN_KEY;
      if (key) {
        const title = '【青藤画室新咨询】' + lead.source;
        const desp =
          '**姓名**：' + lead.name + '\n\n' +
          '**电话**：' + lead.phone + '\n\n' +
          '**年级**：' + (lead.grade || '-') + '\n\n' +
          '**项目**：' + (lead.course || '-') + '\n\n' +
          '**留言**：' + (lead.message || '-') + '\n\n' +
          '**时间**：' + lead.time;
        const fd = new FormData();
        fd.append('title', title);
        fd.append('desp', desp);
        await fetch('https://sctapi.ftqq.com/' + key + '.send', { method: 'POST', body: fd });
      }
    } catch (e) { /* 通知失败不影响线索入库 */ }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: '服务器错误' }), { status: 500, headers: cors });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

async function handleLogin(request, env) {
  try {
    const data = await request.json();
    const password = data.password || "";

    if (!password) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "请输入密码"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(password)
    );

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const storedHash = await env.QT_ADMIN.get("passwordHash");

    if (!storedHash || passwordHash !== storedHash) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "密码错误"
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const tokenBytes = crypto.getRandomValues(new Uint8Array(16));
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    await env.QT_ADMIN.put(
      "token:" + token,
      "1",
      {
        expirationTtl: 8 * 60 * 60
      }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        token
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "登录请求错误"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
  }

async function handleData(request, env, module) {
  if (!module) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "module not found"
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  const token = request.headers.get("X-Token") || "";
  const valid = token
    ? await env.QT_ADMIN.get("token:" + token)
    : null;

  if (!valid) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "未登录"
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  const allowed = [
    "site",
    "fabout",
    "courses",
    "works",
    "env",
    "teacher",
    "whitepaper",
    "faq",
    "cases",
    "articles",
    "planning",
    "settings"
  ];

  if (!allowed.includes(module)) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "module not found"
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

 let data = await env.QT_ADMIN.get("data:" + module);

if (!data) {
  const assetUrl = new URL("/data/" + module + ".json", request.url);
  const assetResponse = await env.ASSETS.fetch(
    new Request(assetUrl.toString())
  );

  if (assetResponse.ok) {
    data = await assetResponse.text();
  }
}

if (!data) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "数据不存在"
    }),
    {
      status: 404,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}

  return new Response(
    data, 
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/login" && request.method === "POST") {
  return handleLogin(request, env);
}
    if (url.pathname === "/api/save" && request.method === "POST") {
  return handleSave(request, env);
}
    if (url.pathname.startsWith("/api/data/") && request.method === "GET") {
  const module = url.pathname.replace("/api/data/", "");
  return handleData(request, env, module);
}
    // API 请求交给 functions/api 中的处理逻辑
    if (url.pathname === "/api/lead" && request.method === "POST") {
      return handleLead(request, env);
    }

    if (url.pathname === "/api/leads" && request.method === "GET") {
      return handleLeads(request, env);
    }

    if (url.pathname === "/api/lead-status" && request.method === "POST") {
      return handleLeadStatus(request, env);
    }

    // 其他请求交给静态资源
    return env.ASSETS.fetch(request);
  }
};

async function handleSave(request, env) {
  const token = request.headers.get("X-Token") || "";
  const valid = token
    ? await env.QT_ADMIN.get("token:" + token)
    : null;

  if (!valid) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "未登录"
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  try {
    const body = await request.json();
    const module = body.module;
    const data = body.data;

    const allowed = [
      "site",
      "fabout",
      "courses",
      "works",
      "env",
      "teacher",
      "whitepaper",
      "faq",
      "cases",
      "articles",
      "planning",
      "settings"
    ];

    if (!allowed.includes(module)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "module not found"
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    await env.QT_ADMIN.put(
      "data:" + module,
      JSON.stringify(data)
    );

    return new Response(
      JSON.stringify({
        ok: true,
        message: "保存成功"
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "保存失败"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
async function handleLead(request, env) {
  try {
    const data = await request.json();

    const {
      name = "",
      phone = "",
      wechat = "",
      grade = "",
      course = "",
      message = "",
      source = ""
    } = data;

    if (!name || !phone) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "姓名和手机号不能为空"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const raw = await env.LEADS.get("leads");

    let arr = [];

    if (raw) {
      try {
        arr = JSON.parse(raw);
      } catch {
        arr = [];
      }
    }

    const lead = {
      id: Date.now().toString(),
      name,
      phone,
      wechat,
      grade,
      course,
      message,
      source,
      time: new Date().toISOString(),
      status: "未联系"
    };

    arr.unshift(lead);

    await env.LEADS.put("leads", JSON.stringify(arr));

    // Server酱通知
    const key = env.SERVERCHAN_KEY;

if (key) {
  try {
    const notifyResponse = await fetch(
      "https://sctapi.ftqq.com/" + key + ".send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          title: "青藤画室收到新的报名咨询",
          desp:
            `姓名：${name}\n` +
            `电话：${phone}\n` +
            `微信：${wechat}\n` +
            `年级：${grade}\n` +
            `课程：${course}\n` +
            `留言：${message}\n` +
            `来源：${source}`
        })
      }
    );

    const notifyResult = await notifyResponse.text();

    console.log(
      "Server酱返回：",
      notifyResponse.status,
      notifyResult
    );

  } catch (error) {
    console.error("Server酱通知失败:", error);
  }
}

    return new Response(
      JSON.stringify({
        success: true,
        message: "提交成功"
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "提交失败"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}


async function handleLeads(request, env) {
  try {
    const raw = await env.LEADS.get("leads");

    const leads = raw ? JSON.parse(raw) : [];

    return new Response(
      JSON.stringify({
        success: true,
        leads
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "获取数据失败"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}


async function handleLeadStatus(request, env) {
  try {
    const data = await request.json();

    const {
      id,
      status
    } = data;

    if (!id || !status) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "参数不完整"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const raw = await env.LEADS.get("leads");

    let arr = raw ? JSON.parse(raw) : [];

    const index = arr.findIndex(
      item => item.id === id
    );

    if (index === -1) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "未找到该客户"
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    arr[index].status = status;

    await env.LEADS.put(
      "leads",
      JSON.stringify(arr)
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "状态更新成功"
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "更新失败"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

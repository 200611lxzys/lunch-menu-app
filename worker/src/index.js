import { sendPushNotification } from "@mmmike/web-push/send";
const SLOTS = ["meat", "side", "veg", "soup"];
const SLOT_LABELS = { meat: "荤菜", side: "家常菜", veg: "蔬菜", soup: "汤品" };

function responseJson(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, GET, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
      "vary": "Origin",
      "cache-control": "no-store"
    }
  });
}

function splitTerms(value) {
  if (Array.isArray(value)) return value.map(String).map(x => x.trim()).filter(Boolean).slice(0, 30);
  return String(value || "").split(/[、，,；;\n]+/).map(x => x.trim()).filter(Boolean).slice(0, 30);
}

const ALIASES = {
  "虾": ["虾", "虾仁", "虾皮", "shrimp", "prawn"],
  "贝类": ["贝", "蛤", "蚝", "牡蛎", "生蚝", "蛏", "贻贝", "扇贝", "shellfish"],
  "海鲜": ["虾", "蟹", "贝", "鱼", "鱿鱼", "海鲜", "shrimp", "fish", "shellfish"],
  "花生": ["花生", "花生油", "peanut"],
  "鸡蛋": ["鸡蛋", "蛋液", "蛋羹", "蛋花", "egg"],
  "乳制品": ["牛奶", "奶油", "奶酪", "黄油", "乳清", "乳制品", "dairy"],
  "大豆": ["大豆", "黄豆", "豆腐", "豆瓣酱", "豆浆", "soy"],
  "小麦": ["小麦", "面粉", "面筋", "酱油", "wheat", "gluten"],
  "香菜": ["香菜", "芫荽", "cilantro", "coriander"]
};

function expandTerms(terms) {
  const out = new Set();
  for (const term of terms) {
    const key = term.toLowerCase();
    const values = ALIASES[key] || [term];
    for (const value of values) out.add(value.toLowerCase());
  }
  return [...out].filter(x => x.length > 0);
}

function safeText(value, max) {
  return String(value || "").replace(/[\u0000-\u001f]/g, " ").slice(0, max);
}

function cleanCandidate(item) {
  if (!item || typeof item !== "object") return null;
  const id = safeText(item.id, 80);
  const slot = safeText(item.slot, 20);
  const name = safeText(item.name, 100);
  const ingredients = safeText(item.ingredients, 800);
  const steps = safeText(item.steps, 1200);
  if (!id || !SLOTS.includes(slot) || !name || !ingredients) return null;
  return { id, slot, name, ingredients, steps };
}

function containsForbidden(candidate, terms) {
  const haystack = (candidate.name + " " + candidate.ingredients).toLowerCase();
  return terms.some(term => haystack.includes(term));
}

function parseModelJson(text) {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.selections)) throw new Error("模型返回结构不正确");
  return parsed;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://200611lxzys.github.io";
    // Health is intentionally readable without an Origin header so it can be checked
    // directly in a browser or with curl. It only reveals whether a key is configured.
    if (request.method === "GET" && url.pathname === "/health") {
      return responseJson({ ok: true, model: "deepseek-flash", configured: Boolean(env.DEEPSEEK_API_KEY) }, 200, origin === allowedOrigin ? allowedOrigin : "");
    }
    if (origin !== allowedOrigin) return new Response("Origin not allowed", { status: 403 });

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": allowedOrigin,
          "access-control-allow-methods": "POST, GET, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400",
          "vary": "Origin"
        }
      });
    }

    if (url.pathname === "/api/push/config" && request.method === "GET") {
      return responseJson({ enabled: Boolean(env.PUSH_DB && env.VAPID_PUBLIC_KEY), publicKey: env.VAPID_PUBLIC_KEY || "" }, 200, allowedOrigin);
    }

    if (url.pathname === "/api/push/subscribe" && request.method === "POST") {
      if (!env.PUSH_DB || !env.VAPID_PUBLIC_KEY) return responseJson({ error: "推送服务尚未配置" }, 503, allowedOrigin);
      let body;
      try { body = await request.json(); } catch { return responseJson({ error: "请求不是有效 JSON" }, 400, allowedOrigin); }
      const sub = body.subscription;
      if (!sub || typeof sub.endpoint !== "string" || !sub.endpoint.startsWith("https://") ||
          sub.endpoint.length > 2048 || !sub.keys?.p256dh || !sub.keys?.auth) {
        return responseJson({ error: "推送订阅信息无效" }, 400, allowedOrigin);
      }
      const timeZone = safeText(body.timeZone || "Asia/Shanghai", 80);
      const sendHour = Math.max(0, Math.min(23, Number(body.sendHour) || 8));
      try { new Intl.DateTimeFormat("en", { timeZone }).format(new Date()); }
      catch { return responseJson({ error: "时区设置无效" }, 400, allowedOrigin); }
      await env.PUSH_DB.prepare(
        "INSERT INTO push_subscriptions (endpoint, subscription_json, time_zone, send_hour, created_at, last_sent_local_date) VALUES (?, ?, ?, ?, ?, NULL) ON CONFLICT(endpoint) DO UPDATE SET subscription_json=excluded.subscription_json, time_zone=excluded.time_zone, send_hour=excluded.send_hour"
      ).bind(sub.endpoint, JSON.stringify(sub), timeZone, sendHour, new Date().toISOString()).run();
      return responseJson({ ok: true }, 200, allowedOrigin);
    }

    if (url.pathname === "/api/push/subscribe" && request.method === "DELETE") {
      if (!env.PUSH_DB) return responseJson({ error: "推送服务尚未配置" }, 503, allowedOrigin);
      let body;
      try { body = await request.json(); } catch { return responseJson({ error: "请求不是有效 JSON" }, 400, allowedOrigin); }
      const endpoint = typeof body.endpoint === "string" && body.endpoint.startsWith("https://") ? body.endpoint.slice(0, 2048) : "";
      if (!endpoint) return responseJson({ error: "订阅地址无效" }, 400, allowedOrigin);
      await env.PUSH_DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).run();
      return responseJson({ ok: true }, 200, allowedOrigin);
    }

    if (request.method !== "POST" || url.pathname !== "/api/menu") {
      return responseJson({ error: "Not found" }, 404, allowedOrigin);
    }
    if (!env.DEEPSEEK_API_KEY) {
      return responseJson({ error: "服务端尚未配置 DeepSeek API Key" }, 503, allowedOrigin);
    }

    if (env.AI_RATE_LIMITER) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const result = await env.AI_RATE_LIMITER.limit({ key: ip });
      if (!result.success) return responseJson({ error: "请求太频繁，请稍后再试" }, 429, allowedOrigin);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 60000) return responseJson({ error: "请求内容过大" }, 413, allowedOrigin);

    let body;
    try { body = await request.json(); }
    catch { return responseJson({ error: "请求不是有效 JSON" }, 400, allowedOrigin); }

    const mode = body.mode === "swap" ? "swap" : body.mode === "generate" ? "generate" : "";
    const targetSlot = safeText(body.targetSlot, 20);
    if (!mode || (mode === "swap" && !SLOTS.includes(targetSlot))) {
      return responseJson({ error: "请求类型或菜品分类无效" }, 400, allowedOrigin);
    }

    const preferences = body.preferences && typeof body.preferences === "object" ? body.preferences : {};
    const forbidden = expandTerms([
      ...splitTerms(preferences.allergies),
      ...splitTerms(preferences.dislikes)
    ]);
    const candidates = (Array.isArray(body.candidates) ? body.candidates : [])
      .map(cleanCandidate).filter(Boolean).slice(0, 32)
      .filter(item => mode !== "swap" || item.slot === targetSlot)
      .filter(item => !containsForbidden(item, forbidden));
    const currentIds = Array.isArray(body.currentIds) ? body.currentIds.map(String) : [];

    if (mode === "generate" && SLOTS.some(slot => !candidates.some(item => item.slot === slot))) {
      return responseJson({ error: "当前菜谱库无法满足全部忌口条件，请调整设置" }, 422, allowedOrigin);
    }
    if (mode === "swap" && !candidates.some(item => item.slot === targetSlot && item.id !== currentIds[SLOTS.indexOf(targetSlot)])) {
      return responseJson({ error: "该分类没有符合条件的替换菜，请调整设置" }, 422, allowedOrigin);
    }

    const input = {
      mode,
      targetSlot: mode === "swap" ? targetSlot : null,
      mealType: safeText(preferences.mealType, 30),
      servings: Math.max(1, Math.min(12, Number(preferences.servings) || 2)),
      taste: safeText(preferences.taste, 200),
      maxMinutes: Math.max(0, Math.min(240, Number(preferences.maxMinutes) || 0)),
      budget: safeText(preferences.budget, 100),
      availableIngredients: safeText(preferences.availableIngredients, 500),
      allergies: splitTerms(preferences.allergies),
      dislikes: splitTerms(preferences.dislikes),
      avoidRepeat: preferences.avoidRepeat !== false,
      dailyWish: safeText(body.dailyWish, 500),
      recentDishes: Array.isArray(body.recentDishes) ? body.recentDishes.map(x => safeText(x, 100)).slice(0, 32) : [],
      currentIds,
      candidates
    };

    const systemPrompt = [
      "你是家庭菜单搭配助手。只从传入的 candidates 中选菜，不能编造候选菜、ID、食材或做法。",
      "硬性遵守 allergies 和 dislikes；候选列表已由程序过滤，仍须避免推荐任何可能冲突的候选。",
      "尽量满足口味、用餐类型、人数、时间、预算和当天愿望，并尽量避开近期重复。",
      "generate 模式必须从 meat、side、veg、soup 各选一项；swap 模式只选 targetSlot 的一项，且尽量不同于 currentIds。",
      "只返回 JSON 对象，格式为 { selections: [{ slot, id, reason }], summary }。reason 和 summary 用简体中文，理由简短。"
    ].join("\n");

    let upstream;
    try {
      upstream = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "authorization": "Bearer " + env.DEEPSEEK_API_KEY,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(input) }
          ],
          response_format: { type: "json_object" },
          temperature: 0.25,
          max_tokens: 1200
        }),
        signal: AbortSignal.timeout(25000)
      });
    } catch {
      return responseJson({ error: "暂时无法连接推荐服务" }, 502, allowedOrigin);
    }

    if (!upstream.ok) {
      return responseJson({ error: "模型服务暂不可用", upstreamStatus: upstream.status }, 502, allowedOrigin);
    }

    let modelResult;
    try {
      const data = await upstream.json();
      modelResult = parseModelJson(data.choices?.[0]?.message?.content || "");
    } catch {
      return responseJson({ error: "模型暂时没有返回可用菜单" }, 502, allowedOrigin);
    }

    const byId = new Map(candidates.map(item => [item.id, item]));
    const selections = modelResult.selections;
    if (mode === "generate") {
      if (selections.length !== 4) return responseJson({ error: "模型返回菜品数量不正确" }, 502, allowedOrigin);
      const usedSlots = new Set();
      const usedIds = new Set();
      for (const selection of selections) {
        const candidate = byId.get(String(selection.id));
        if (!candidate || candidate.slot !== selection.slot || usedSlots.has(candidate.slot) || usedIds.has(candidate.id)) {
          return responseJson({ error: "模型返回了菜谱库以外或重复的菜" }, 502, allowedOrigin);
        }
        usedSlots.add(candidate.slot);
        usedIds.add(candidate.id);
      }
      if (SLOTS.some(slot => !usedSlots.has(slot))) return responseJson({ error: "模型没有覆盖四个菜品分类" }, 502, allowedOrigin);
    } else {
      if (selections.length !== 1) return responseJson({ error: "模型返回菜品数量不正确" }, 502, allowedOrigin);
      const candidate = byId.get(String(selections[0].id));
      if (!candidate || candidate.slot !== targetSlot || candidate.id === currentIds[SLOTS.indexOf(targetSlot)]) {
        return responseJson({ error: "模型返回的替换菜不符合要求" }, 502, allowedOrigin);
      }
    }

    const sanitized = selections.map(selection => ({
      slot: selection.slot,
      id: String(selection.id),
      reason: safeText(selection.reason, 160)
    }));
    return responseJson({
      ok: true,
      model: "deepseek-flash",
      selections: sanitized,
      summary: safeText(modelResult.summary, 240)
    }, 200, allowedOrigin);
  },
  async scheduled(controller, env) {
    if (!env.PUSH_DB || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return;
    const { results = [] } = await env.PUSH_DB.prepare(
      "SELECT endpoint, subscription_json, time_zone, send_hour, last_sent_local_date FROM push_subscriptions"
    ).all();
    for (const row of results) {
      let parts;
      try {
        parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: row.time_zone,
          year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
          hourCycle: "h23"
        }).formatToParts(new Date(controller.scheduledTime));
      } catch { continue; }
      const part = Object.fromEntries(parts.map(item => [item.type, item.value]));
      const localDate = `${part.year}-${part.month}-${part.day}`;
      if (Number(part.hour) !== Number(row.send_hour) || row.last_sent_local_date === localDate) continue;
      try {
        const subscription = JSON.parse(row.subscription_json);
        const sent = await sendPushNotification(subscription, {
          title: "好好吃饭 · 今日菜单",
          body: "今天的四道菜已准备好，点开查看食材和下厨步骤。",
          url: "https://200611lxzys.github.io/lunch-menu-app/"
        }, {
          publicKey: env.VAPID_PUBLIC_KEY,
          privateKey: env.VAPID_PRIVATE_KEY,
          subject: env.VAPID_SUBJECT
        });
        if (!sent) {
          await env.PUSH_DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(row.endpoint).run();
          continue;
        }
        await env.PUSH_DB.prepare("UPDATE push_subscriptions SET last_sent_local_date = ? WHERE endpoint = ?").bind(localDate, row.endpoint).run();
      } catch (error) {
        console.error("Push delivery failed; subscription retained for retry.", String(error?.message || error).slice(0, 160));
      }
    }
  }
};
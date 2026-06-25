// ─────────────────────────────────────────────────────────────────────────
//  Türkiye Together — chat proxy (Cloudflare Worker)
//  Hides an Anthropic Claude API key and relays the trip chatbot's messages.
//  The website POSTs { system, messages }; this returns { reply }.
//
//  Deploy: see SETUP.md §5. Set these Worker variables/secrets:
//    • ANTHROPIC_KEY   (Secret)  — your Anthropic API key (sk-ant-…)
//    • ANTHROPIC_MODEL (Text, optional) — defaults to a fast, cheap model
// ─────────────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);
    if (!env.ANTHROPIC_KEY) return json({ error: "ANTHROPIC_KEY is not set on the Worker." }, 500, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400, cors); }

    // Keep the conversation small & sane; strip anything but role/content.
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-16)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!messages.length) return json({ error: "No messages." }, 400, cors);
    const system = String(body.system || "You are a friendly, concise travel assistant.").slice(0, 4000);

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system,
          messages,
        }),
      });
      const data = await r.json();
      if (!r.ok) return json({ error: (data.error && data.error.message) || "Upstream error." }, 502, cors);
      const reply = (data.content || []).map((b) => b.text || "").join("").trim();
      return json({ reply }, 200, cors);
    } catch (e) {
      return json({ error: String(e) }, 502, cors);
    }
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...cors } });
}

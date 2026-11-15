// Key Chat personal relay — a free Cloudflare Worker.
// Lets the app reach AI providers that block direct browser calls
// (Ollama Cloud, OpenCode Zen, NVIDIA, Kilo, Z.ai, GitHub Models, SambaNova, ...).
//
// Safety:
//  * Only forwards to the hosts in ALLOW below (it is not an open proxy).
//  * Every request must carry your secret RELAY_TOKEN (set it as a Worker secret).
//  * Your provider API key passes straight through; nothing is stored or logged here.
//
// Deploy: dash.cloudflare.com > Workers & Pages > Create > "Hello World" Worker >
//   Edit code > paste this file > Deploy. Then Settings > Variables and Secrets >
//   add Secret RELAY_TOKEN = any long random text. Put the worker URL and the same
//   text into Key Chat > Settings > Relay.

const ALLOW = new Set([
  "ollama.com", "opencode.ai", "integrate.api.nvidia.com", "api.kilo.ai",
  "api.z.ai", "open.bigmodel.cn", "models.github.ai", "api.sambanova.ai",
  "api.ainative.studio", "router.bynara.id", "api.xkiro.com", "api.iteracompute.com",
  "api.cerebras.ai", "api.cloudflare.com",
]);

const cors = (origin) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-relay-token",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });

    const fail = (status, message) => new Response(JSON.stringify({ error: { message } }),
      { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

    if (!env.RELAY_TOKEN) return fail(500, "Relay not set up: add the RELAY_TOKEN secret in Cloudflare.");
    if (request.headers.get("x-relay-token") !== env.RELAY_TOKEN) return fail(401, "Wrong relay token.");

    // Path form: https://your-relay.workers.dev/<host>/<path>
    const url = new URL(request.url);
    const rest = url.pathname.replace(/^\/+/, "");
    const host = rest.split("/")[0];
    if (!ALLOW.has(host)) return fail(403, `Host not allowed by this relay: ${host || "(none)"}`);
    const target = "https://" + rest + url.search;

    const headers = new Headers();
    for (const h of ["authorization", "content-type", "accept"]) {
      const v = request.headers.get(h); if (v) headers.set(h, v);
    }
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await request.arrayBuffer(),
    });
    const out = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(cors(origin))) out.set(k, v);
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const route = incoming.pathname.replace(/\/+$/, "") || "/";

    // Site-hosted protected script endpoint for generated Lua loadstrings.
    if (route.startsWith("/script/") && request.method === "GET") {
      const slug = decodeURIComponent(route.slice("/script/".length));
      const key = incoming.searchParams.get("key") || "";
      const protectedPage = () => new Response("<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><meta name='theme-color' content='#07090f'><title>Protected · VOID DEVELOPMENT</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 0%,#122752 0,transparent 55%),#07090f;color:#f4f7ff;font:15px/1.7 system-ui,sans-serif;padding:24px}.card{max-width:620px;text-align:center;padding:48px 36px;border:1px solid #253654;border-radius:28px;background:#0d111b;box-shadow:0 28px 100px #0008}.mark{font-size:12px;letter-spacing:.35em;color:#83a7ff;font-weight:800}.lock{font-size:42px;margin:24px 0 8px}h1{font-size:clamp(28px,5vw,42px);letter-spacing:-.04em;margin:0 0 12px}p{color:#9ba9c1;margin:0 auto 24px;max-width:430px}.line{height:1px;background:#202c43;margin:24px 0}.note{font-size:12px;color:#667895}</style></head><body><main class='card'><div class='mark'>VOID DEVELOPMENT</div><div class='lock'>⌑</div><h1>This script is protected.</h1><p>This script is protected by ARIO Development. Better luck next time lol.</p><div class='line'></div><div class='note'>PRIVATE SOURCE · ACCESS CONTROL ENABLED</div></main></body></html>", {status:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
      if (!slug) return protectedPage();
      const wantsHtml = (request.headers.get('accept') || '').includes('text/html');
      const api = new URL("https://cqtwmxojwwyeasstuhgb.supabase.co/functions/v1/script-api");
      api.searchParams.set("action", "load");
      api.searchParams.set("script", slug);
      api.searchParams.set("key", key);
      const upstream = await fetch(api.toString(), { headers: { "Accept": "text/plain" } });
      if (!upstream.ok && wantsHtml) return protectedPage();
      const headers = new Headers(upstream.headers);
      headers.set("Cache-Control", "no-store, max-age=0");
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    // Friendly account URLs open the auth dialog while still serving the static app.
    const url = new URL(request.url);
    if (route === "/signup" || route === "/login") {
      url.pathname = "/";
      url.searchParams.set("auth", route === "/signup" ? "signup" : "login");
    } else if (route === "/themes" || route === "/about" || route === "/scripts") {
      url.pathname = "/";
      url.searchParams.set("view", route === "/scripts" ? "scripts" : route.slice(1));
    }

    // Keep the existing key system and add the protected-loader helper.
    const response = await env.ASSETS.fetch(new Request(url, request));
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return response;
    const html = await response.text();
    const injected = html.replace(/<\/body>/i, '  <script src="/key-system.js"></script>\n  <script src="/protect-tools.js"></script>\n</body>');
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(injected, { status: response.status, statusText: response.statusText, headers });
  }
};

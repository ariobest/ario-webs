export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const route = incoming.pathname.replace(/\/+$/, "") || "/";

    // Site-hosted protected script endpoint for generated Lua loadstrings.
    if (route.startsWith("/script/") && request.method === "GET") {
      const slug = decodeURIComponent(route.slice("/script/".length));
      const key = incoming.searchParams.get("key") || "";
      if (!slug) return new Response("THIS SCRIPT IS PROTECTED BY ARIO DEVELOPMENT — BETTER LUCK NEXT TIME.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
      const api = new URL("https://cqtwmxojwwyeasstuhgb.supabase.co/functions/v1/script-api");
      api.searchParams.set("action", "load");
      api.searchParams.set("script", slug);
      api.searchParams.set("key", key);
      const upstream = await fetch(api.toString(), { headers: { "Accept": "text/plain" } });
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

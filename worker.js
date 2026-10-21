export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const route = url.pathname.replace(/\/+$/, "") || "/";
    if (route === "/signup" || route === "/login") {
      url.pathname = "/";
      url.searchParams.set("auth", route === "/signup" ? "signup" : "login");
    } else if (route === "/themes" || route === "/about" || route === "/scripts") {
      url.pathname = "/";
      url.searchParams.set("view", route === "/scripts" ? "scripts" : route.slice(1));
    }
    const response = await env.ASSETS.fetch(new Request(url, request));
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return response;
    const html = await response.text();
    const injected = html.replace(/<\/body>/i, '  <script src="/key-system.js"></script>\n</body>');
    return new Response(injected, { status: response.status, statusText: response.statusText, headers: response.headers });
  }
};

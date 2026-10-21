export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Friendly account URLs open the auth dialog while still serving the static app.
    const route = url.pathname.replace(/\/+$/, "") || "/";
    if (route === "/signup" || route === "/login") {
      url.pathname = "/";
      url.searchParams.set("auth", route === "/signup" ? "signup" : "login");
    } else if (route === "/themes" || route === "/about" || route === "/scripts") {
      url.pathname = "/";
      url.searchParams.set("view", route === "/scripts" ? "scripts" : route.slice(1));
    }
    // Let Cloudflare's Workers Assets binding serve everything in /public.
    // This is the Workers equivalent of a Pages static deployment.
    return env.ASSETS.fetch(new Request(url, request));
  }
};

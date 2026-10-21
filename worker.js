export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Let Cloudflare's Workers Assets binding serve everything in /public.
    // This is the Workers equivalent of a Pages static deployment.
    return env.ASSETS.fetch(new Request(url, request));
  }
};

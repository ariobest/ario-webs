/**
 * VOID DEVELOPMENT protected script proxy.
 *
 * Public URLs use arioscripts.cyou/<opaque-token>?s=<script-slug>.
 * The opaque path is branding, not a security boundary; the script source
 * must still be treated as visible to any client that downloads it.
 */
export async function onRequest(context) {
  const { request, params } = context;
  const incoming = new URL(request.url);
  const slug = incoming.searchParams.get("s");

  // Let the static site handle normal pages and assets.
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    return context.next();
  }

  const upstream = new URL("https://cqtwmxojwwyeasstuhgb.supabase.co/functions/v1/ario-raw");
  upstream.searchParams.set("s", slug);

  const headers = new Headers();
  const accept = request.headers.get("Accept");
  if (accept) headers.set("Accept", accept);
  const userAgent = request.headers.get("User-Agent");
  if (userAgent) headers.set("User-Agent", userAgent);

  try {
    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers,
      redirect: "manual"
    });
    const outHeaders = new Headers(response.headers);
    outHeaders.set("Cache-Control", "no-store, max-age=0");
    outHeaders.set("Pragma", "no-cache");
    outHeaders.delete("Location");
    outHeaders.delete("Access-Control-Allow-Origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: outHeaders
    });
  } catch {
    return new Response("Protected delivery temporarily unavailable.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
}

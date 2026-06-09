/**
 * Cloudflare Pages Function — serve uploaded gallery images from R2.
 *
 * GET /api/media/<key>  → streams the R2 object with immutable caching.
 *
 * Bindings: R2 bucket bound as GALLERY_BUCKET.
 */

interface Env {
  GALLERY_BUCKET: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const parts = params.path;
  const key = Array.isArray(parts) ? parts.join("/") : String(parts || "");
  if (!key) return new Response("Not found", { status: 404 });

  const obj = await env.GALLERY_BUCKET.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
};

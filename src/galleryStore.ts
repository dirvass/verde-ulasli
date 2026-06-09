/** Client-side gallery store.
 *
 *  Source of truth: Cloudflare KV via /api/gallery (Pages Function).
 *  Falls back to the built-in DEFAULT_MANIFEST so the public gallery always
 *  renders, even before the first admin save or if the API is unreachable.
 *  Token helpers are shared with the availability admin.
 */

import { DEFAULT_MANIFEST } from "./data/galleryManifest";
import { validateManifest, type GalleryManifest } from "./data/galleryTypes";

export type { GalleryManifest, GalleryItem } from "./data/galleryTypes";
export { DEFAULT_MANIFEST };

const API_URL = "/api/gallery";

/** Fetch the manifest from the server. Falls back to the built-in default on
 *  any error or when the server has no saved items yet. */
export async function fetchManifest(): Promise<GalleryManifest> {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const validated = validateManifest(body);
    if (validated && validated.items.length > 0) return validated;
  } catch { /* fall through to default */ }
  return DEFAULT_MANIFEST;
}

/** Admin write — POSTs the full manifest with a Bearer token. */
export async function saveManifest(manifest: GalleryManifest, token: string): Promise<GalleryManifest> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(manifest),
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`save-failed:${res.status}`);
  const body = await res.json();
  const validated = validateManifest(body?.data);
  if (!validated) throw new Error("invalid-response");
  return validated;
}

/** Admin upload — sends already-resized image bytes, returns its public src. */
export async function uploadImage(blob: Blob, ext: string, token: string): Promise<{ src: string }> {
  const res = await fetch(`${API_URL}?upload=1`, {
    method: "POST",
    headers: {
      "content-type": blob.type || "image/jpeg",
      authorization: `Bearer ${token}`,
      "x-ext": ext,
    },
    body: blob,
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`upload-failed:${res.status}`);
  return res.json();
}

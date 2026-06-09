/** Client-side image optimisation: downscale to a sensible web size before
 *  upload, so the owner can drop in full-resolution renders/photos and the
 *  site stays fast (and within Cloudflare's serving sweet spot).
 */

const MAX_EDGE = 1920;
const QUALITY = 0.85;

/** Resize an image File to a JPEG Blob with its longest edge <= 1920px. */
export async function resizeImage(file: File): Promise<{ blob: Blob; ext: string }> {
  if (!file.type.startsWith("image/")) throw new Error("not-an-image");

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) throw new Error("encode-failed");
  return { blob, ext: "jpg" };
}

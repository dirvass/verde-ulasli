# Cloudflare bindings — Gallery Extranet

The gallery manager needs two storage bindings on the Cloudflare Pages project.
The `ADMIN_TOKEN` environment variable already exists (reused from availability).

## In Cloudflare dashboard → Pages → (this project) → Settings → Functions

### 1. KV namespace (stores the gallery arrangement)
- KV → Create namespace → name it `verde-gallery`.
- Pages → Settings → Functions → **KV namespace bindings** → Add binding:
  - Variable name: **`GALLERY`**
  - Namespace: `verde-gallery`

### 2. R2 bucket (stores uploaded photos)
- R2 → Create bucket → name it `verde-gallery`.
  (Enabling R2 is free under the free tier; the account may need a card on file.)
- Pages → Settings → Functions → **R2 bucket bindings** → Add binding:
  - Variable name: **`GALLERY_BUCKET`**
  - Bucket: `verde-gallery`

### 3. Redeploy
Bindings apply to new deployments. Trigger a redeploy (push to the repo, or
"Retry deployment" in the dashboard).

## Verify after deploy
- `https://verde-ulasli.com/api/gallery` returns `{"items":[...]}` (empty
  `{"items":[]}` until the first save from the admin Gallery tab).
- `/admin` → Gallery tab loads the seeded photos. Upload / reorder / Save.
- `/gallery?cb=1` (fresh tab) reflects the saved changes.

## Local dev with bindings (optional)
`npx wrangler pages dev dist --kv GALLERY --r2 GALLERY_BUCKET` after `npm run build`.
Without bindings the public page still works via the built-in fallback manifest.

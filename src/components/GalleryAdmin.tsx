import React, { useEffect, useState, useCallback, useRef } from "react";
import { fetchManifest, saveManifest, uploadImage } from "../galleryStore";
import { CATEGORIES, FRONTS, type GalleryItem } from "../data/galleryTypes";
import { resizeImage } from "../lib/imageResize";

/** Owner-facing gallery manager. Edits the manifest locally, then publishes it
 *  to the live site via Save. Reorder by drag (or the ↑ ↓ buttons on touch).
 *  The session token comes from the parent — this never prompts on its own. */
export default function GalleryAdmin({ token, onAuthError }: { token: string; onAuthError: () => void }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(0);
  const [dirty, setDirty] = useState(false);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetchManifest().then((m) => { if (alive) { setItems(m.items); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  // Warn before leaving with unsaved arrangement changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setField = (i: number, field: keyof GalleryItem, value: string) => {
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
    setSaved(false); setDirty(true);
  };

  const move = (i: number, dir: -1 | 1) =>
    setItems((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const next = p.slice();
      [next[i], next[j]] = [next[j], next[i]];
      setSaved(false); setDirty(true);
      return next;
    });

  const removeItem = (i: number) =>
    setItems((p) => {
      if (!window.confirm("Remove this photo from the gallery?")) return p;
      setSaved(false); setDirty(true);
      return p.filter((_, idx) => idx !== i);
    });

  const drop = (to: number) =>
    setItems((p) => {
      const from = dragFrom.current;
      dragFrom.current = null;
      if (from === null || from === to) return p;
      const next = p.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setSaved(false); setDirty(true);
      return next;
    });

  const onUploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    for (const file of Array.from(files)) {
      setBusy((b) => b + 1);
      try {
        const { blob, ext } = await resizeImage(file);
        const { src } = await uploadImage(blob, ext, token);
        // Prepend so the new photo is immediately visible at the top, ready to place.
        setItems((p) => [
          { id: crypto.randomUUID(), type: "image", src, category: "interior", front: "off", caption: "" },
          ...p,
        ]);
        setSaved(false); setDirty(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "upload-failed";
        if (msg === "unauthorized") onAuthError();
        else if (msg === "not-an-image") setError("That file isn't an image.");
        else setError(`Upload failed (${msg}).`);
      } finally {
        setBusy((b) => b - 1);
      }
    }
  }, [token, onAuthError]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const fresh = await saveManifest({ items }, token);
      setItems(fresh.items);
      setSaved(true); setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "save-failed";
      if (msg === "unauthorized") onAuthError();
      else setError(`Could not save (${msg}).`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="admin-empty">Loading gallery…</p>;

  return (
    <section className="gadmin">
      <div className="gadmin__bar">
        <label className="admin-btn admin-btn--add gadmin__upload">
          {busy > 0 ? `Uploading… (${busy})` : "+ Upload photos"}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => { onUploadFiles(e.target.files); e.currentTarget.value = ""; }}
          />
        </label>
        <span className="gadmin__count">{items.length} items</span>
        <button type="button" className="admin-btn admin-btn--save" onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>

      {error && <p className="admin-enquiries__error" role="alert">{error}</p>}
      <p className="admin-save__hint">
        Drag a card (or use ↑ ↓) to reorder. “Front” puts a photo in the “A First Look” opener — big or small.
        Save publishes to the live site for all visitors.
      </p>

      <div className="gadmin__grid">
        {items.map((it, i) => (
          <article
            key={it.id}
            className="gadmin__card"
            draggable
            onDragStart={() => (dragFrom.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(i)}
          >
            <div className="gadmin__thumb">
              <img src={it.type === "video" ? (it.poster || it.src) : it.src} alt={it.caption} loading="lazy" />
              {it.type === "video" && <span className="gadmin__vid">video</span>}
            </div>
            <div className="gadmin__row">
              <button type="button" className="gadmin__mini" onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button type="button" className="gadmin__mini" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              <button type="button" className="gadmin__mini gadmin__mini--del" onClick={() => removeItem(i)} aria-label="Remove">✕</button>
            </div>
            <label className="gadmin__field">
              <span>Tab</span>
              <select value={it.category} onChange={(e) => setField(i, "category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="gadmin__field">
              <span>Front</span>
              <select value={it.front} onChange={(e) => setField(i, "front", e.target.value)}>
                {FRONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label className="gadmin__field">
              <span>Caption</span>
              <input value={it.caption} onChange={(e) => setField(i, "caption", e.target.value)} maxLength={300} />
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}

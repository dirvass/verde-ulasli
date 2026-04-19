import React, { useState, useEffect, useRef } from "react";

const HASH = "c22ad879c45d1f7399bb9c859838d7c43ee0dc875fbc256666fcc437088c32bf";
const KEY = "verde-auth";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(() => {
    try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
  });
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [vis, setVis] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { const t = setTimeout(() => setVis(true), 80); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!ok) inputRef.current?.focus(); }, [ok]);

  if (ok) return <>{children}</>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    // Deliberate small delay to slow brute-force attempts
    await new Promise(r => setTimeout(r, 350));
    const h = await sha256(pw);
    if (h === HASH) {
      try { sessionStorage.setItem(KEY, "1"); } catch { /* swallow */ }
      setOk(true);
    } else {
      setErr("Incorrect password. Please try again.");
      setPw("");
    }
    setBusy(false);
  }

  return (
    <div className={`pw-gate ${vis ? "pw-gate--vis" : ""}`} role="dialog" aria-modal="true" aria-labelledby="pw-title">
      <form className="pw-card" onSubmit={submit} noValidate>
        <span id="pw-title" className="pw-brand">VERDE ULAŞLI</span>
        <div className="pw-line" aria-hidden="true" />
        <p className="pw-hint">Private access — enter the passphrase you were given</p>
        <label className="pw-label" htmlFor="pw-input">Password</label>
        <input
          ref={inputRef}
          id="pw-input"
          className="pw-input"
          type="password"
          placeholder="Password"
          value={pw}
          onChange={e => { setPw(e.target.value); if (err) setErr(null); }}
          autoComplete="current-password"
          autoFocus
          aria-invalid={Boolean(err)}
          aria-describedby={err ? "pw-err" : undefined}
          disabled={busy}
        />
        {err && <span id="pw-err" className="pw-err" role="alert">{err}</span>}
        <button type="submit" className="pw-btn" disabled={busy || pw.length === 0}>
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}

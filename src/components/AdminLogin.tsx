import React, { useState } from "react";
import TopNav from "./TopNav";

/** Single sign-in gate for the admin extranet. Validates the password once
 *  against an authenticated endpoint, then the rest of the admin never asks
 *  again for the session. */
export default function AdminLogin({ onAuth }: { onAuth: (token: string) => void }) {
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = value.trim();
    if (!token) return;
    setChecking(true);
    setError(null);
    try {
      // /api/enquiry requires auth — use it to verify the password up front.
      const res = await fetch("/api/enquiry", { headers: { authorization: `Bearer ${token}` } });
      if (res.status === 401) { setError("That password isn't right. Try again."); setChecking(false); return; }
      if (!res.ok) throw new Error(String(res.status));
      onAuth(token);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setChecking(false);
    }
  }

  return (
    <>
      <header className="admin-hero admin-hero--vis">
        <div className="admin-hero__bg" aria-hidden="true" />
        <div className="admin-hero__ov" aria-hidden="true" />
        <TopNav />
        <div className="admin-hero__ct">
          <span className="admin-hero__badge">Extranet</span>
          <h1 className="admin-hero__title">Sign In</h1>
          <div className="admin-hero__line" />
          <p className="admin-hero__sub">Enter your password to manage availability, enquiries and the gallery.</p>
        </div>
      </header>

      <main className="admin">
        <form className="admin-login" onSubmit={submit}>
          <label className="admin-field" htmlFor="admin-pw">
            <span>Admin password</span>
            <input
              id="admin-pw"
              type="password"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="admin-btn admin-btn--save" disabled={checking || !value.trim()}>
            {checking ? "Checking…" : "Enter"}
          </button>
          {error && <p className="admin-enquiries__error" role="alert">{error}</p>}
        </form>
      </main>
    </>
  );
}

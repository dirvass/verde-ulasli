import React from "react";
import TopNav from "../components/TopNav";
import Footer from "../components/Footer";

type Section = { title: string; body: string };

export default function LegalLayout({
  title,
  intro,
  sections,
  contact,
}: {
  title: string;
  intro: string;
  sections: Section[];
  contact?: string;
}) {
  return (
    <div style={{ background: "#EBE8E1", minHeight: "100vh" }}>
      <div style={{
        background: "linear-gradient(135deg, #0E1A16 0%, #2D5040 100%)",
        color: "#EBE8E1",
        padding: "24px 0 56px",
      }}>
        <TopNav />
        <div style={{ maxWidth: 800, margin: "24px auto 0", padding: "0 24px" }}>
          <div style={{ letterSpacing: 5, fontSize: 10, color: "#C3A564", textTransform: "uppercase", marginBottom: 10 }}>
            VERDE · ULAŞLI
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(28px,5vw,44px)", fontWeight: 500, lineHeight: 1.1 }}>
            {title}
          </h1>
          <div style={{ width: 40, height: 1, background: "#C3A564", margin: "18px 0" }} />
          <p style={{ color: "rgba(235,232,225,0.78)", fontSize: 15, maxWidth: 640 }}>
            {intro}
          </p>
        </div>
      </div>

      <article style={{
        maxWidth: 800,
        margin: "-30px auto 0",
        padding: "40px 32px",
        background: "#fff",
        borderRadius: 6,
        boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
        position: "relative",
        zIndex: 2,
      }}>
        {sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 24 }}>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 20,
              color: "#0E1A16",
              marginBottom: 8,
            }}>{s.title}</h2>
            <p style={{ color: "#44504a", fontSize: 14, lineHeight: 1.65 }}>{s.body}</p>
          </section>
        ))}
        {contact && (
          <p style={{ color: "#44504a", fontSize: 13, borderTop: "1px solid rgba(14,26,22,0.1)", paddingTop: 18, marginTop: 30 }}>
            {contact}
          </p>
        )}
        <p style={{ color: "rgba(68,80,74,0.6)", fontSize: 11, marginTop: 24, letterSpacing: 1, textTransform: "uppercase" }}>
          Last updated · 19 April 2026
        </p>
      </article>

      <Footer />
    </div>
  );
}

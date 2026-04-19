import React from "react";
import TopNav from "../components/TopNav";
import Footer from "../components/Footer";
import "../styles/LegalPage.css";

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
    <div className="legal-page">
      <div className="legal-hero">
        <TopNav />
        <div className="legal-hero__inner">
          <div className="legal-hero__brand">VERDE · ULAŞLI</div>
          <h1 className="legal-hero__title">{title}</h1>
          <div className="legal-hero__rule" aria-hidden="true" />
          <p className="legal-hero__intro">{intro}</p>
        </div>
      </div>

      <article className="legal-article">
        {sections.map((s, i) => (
          <section key={i} className="legal-section">
            <h2 className="legal-section__title">{s.title}</h2>
            <p className="legal-section__body">{s.body}</p>
          </section>
        ))}
        {contact && <p className="legal-article__contact">{contact}</p>}
        <p className="legal-article__updated">Last updated · 19 April 2026</p>
      </article>

      <Footer />
    </div>
  );
}

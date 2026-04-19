import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./i18n/LanguageContext";
import Home from "./Home";
import StoryPage from "./StoryPage";
import ExperiencePage from "./ExperiencePage";
import BookingPage from "./BookingPage";
import GalleryPage from "./GalleryPage";
import PasswordGate from "./components/PasswordGate";
import NotFoundPage from "./NotFoundPage";
import ErrorBoundary from "./components/ErrorBoundary";
import CookieBanner from "./components/CookieBanner";
import PrivacyPage from "./legal/PrivacyPage";
import CookiesPage from "./legal/CookiesPage";
import TermsPage from "./legal/TermsPage";
import ImpressumPage from "./legal/ImpressumPage";

const InvestorPage = lazy(() => import("./InvestorPage"));
const AdminPage = lazy(() => import("./AdminPage"));

function RouteFallback() {
  return (
    <div style={{
      minHeight: "70vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0E1A16",
      color: "#C3A564",
      fontFamily: "'Playfair Display', Georgia, serif",
      letterSpacing: "6px",
      fontSize: 12,
    }}>
      LOADING
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/story" element={<StoryPage />} />
              <Route path="/experience" element={<ExperiencePage />} />
              <Route path="/book" element={<BookingPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/cookies" element={<CookiesPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/impressum" element={<ImpressumPage />} />
              <Route path="/investor" element={<PasswordGate><InvestorPage /></PasswordGate>} />
              <Route path="/admin" element={<PasswordGate><AdminPage /></PasswordGate>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <CookieBanner />
        </BrowserRouter>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

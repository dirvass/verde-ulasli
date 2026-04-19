import React from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { usePageMeta } from "../hooks/usePageMeta";
import LegalLayout from "./LegalLayout";

export default function TermsPage() {
  usePageMeta("terms.title", "terms.intro");
  const { t } = useLanguage();
  return (
    <LegalLayout
      title={t("terms.title")}
      intro={t("terms.intro")}
      sections={[
        { title: t("terms.bookTitle"), body: t("terms.bookBody") },
        { title: t("terms.cancelTitle"), body: t("terms.cancelBody") },
        { title: t("terms.lawTitle"), body: t("terms.lawBody") },
      ]}
    />
  );
}

import React from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { usePageMeta } from "../hooks/usePageMeta";
import LegalLayout from "./LegalLayout";

export default function CookiesPage() {
  usePageMeta("cookies.title", "cookies.intro");
  const { t } = useLanguage();
  return (
    <LegalLayout
      title={t("cookies.title")}
      intro={t("cookies.intro")}
      sections={[
        { title: t("cookies.whatTitle"), body: t("cookies.whatBody") },
        { title: t("cookies.choiceTitle"), body: t("cookies.choiceBody") },
      ]}
      contact={t("cookies.contact")}
    />
  );
}

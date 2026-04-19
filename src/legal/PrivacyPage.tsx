import React from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { usePageMeta } from "../hooks/usePageMeta";
import LegalLayout from "./LegalLayout";

export default function PrivacyPage() {
  usePageMeta("privacy.title", "privacy.intro");
  const { t } = useLanguage();
  return (
    <LegalLayout
      title={t("privacy.title")}
      intro={t("privacy.intro")}
      sections={[
        { title: t("privacy.dataTitle"), body: t("privacy.dataBody") },
        { title: t("privacy.rightsTitle"), body: t("privacy.rightsBody") },
      ]}
      contact={t("privacy.contact")}
    />
  );
}

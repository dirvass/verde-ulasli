import React from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { usePageMeta } from "../hooks/usePageMeta";
import LegalLayout from "./LegalLayout";

export default function ImpressumPage() {
  usePageMeta("impressum.title", "impressum.responsibleBody");
  const { t } = useLanguage();
  return (
    <LegalLayout
      title={t("impressum.title")}
      intro={t("impressum.responsibleBody")}
      sections={[
        { title: t("impressum.contact"), body: t("impressum.contactBody") },
        { title: t("impressum.content"), body: t("impressum.contentBody") },
        { title: t("impressum.hosting"), body: t("impressum.hostingBody") },
      ]}
    />
  );
}

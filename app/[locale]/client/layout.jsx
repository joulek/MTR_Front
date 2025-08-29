// app/[locale]/client/layout.jsx
import ClientLayoutShell from "./layout.client";
import { getTranslations } from "next-intl/server";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: "auth.client.layout.seo" });
  const title = t("title", { default: "Espace client | MTR Industry" });
  const description = t("description", { default: "Accédez à votre espace client MTR Industry." });
  const url = `${APP_URL}/${locale}/client`;
  const ogImage = `${APP_URL}/og/client.jpg`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/client`,
      languages: { fr: "/fr/client", en: "/en/client" },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "MTR Industry",
      images: [{ url: ogImage, width: 1200, height: 630, alt: t("ogAlt", { default: "Espace client MTR Industry" }) }],
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    // important : l'espace client ne doit pas être indexé
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}

export default function Layout({ children, params: { locale } }) {
  return <ClientLayoutShell locale={locale}>{children}</ClientLayoutShell>;
}

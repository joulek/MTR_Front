// app/[locale]/client/mes-reclamations/page.jsx
import MesReclamationsClient from "./MesReclamationsClient";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: "auth.client.claimsPage.seo" });

  const title = t("title", { default: "Mes réclamations – Espace client | MTR Industry" });
  const description = t("description", {
    default: "Consultez, filtrez et téléchargez vos réclamations client (PDF, détails, statut).",
  });

  const url = `${APP_URL}/${locale}/client/mes-reclamations`;
  const images = [
    {
      url: `${APP_URL}/og/mes-reclamations.jpg`,
      width: 1200,
      height: 630,
      alt: t("ogAlt", { default: "Aperçu de la page Mes réclamations – MTR Industry" }),
    },
  ];

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/client/mes-reclamations`,
      languages: {
        fr: "/fr/client/mes-reclamations",
        en: "/en/client/mes-reclamations",
      },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "MTR Industry",
      images,
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((i) => i.url),
    },
    // page d'espace client → pas indexée
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false, noimageindex: true },
      nocache: true,
    },
  };
}

export default async function Page({ params: { locale } }) {
  // ⬇️ même namespace que dans generateMetadata
  const tSeo = await getTranslations({ locale, namespace: "auth.client.claimsPage.seo" });

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: `${APP_URL}/${locale}` },
      { "@type": "ListItem", position: 2, name: locale === "fr" ? "Espace client" : "Client area", item: `${APP_URL}/${locale}/client` },
      { "@type": "ListItem", position: 3, name: locale === "fr" ? "Mes réclamations" : "My claims", item: `${APP_URL}/${locale}/client/mes-reclamations` },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: tSeo("title", { default: "Mes réclamations – Espace client" }),
    description: tSeo("description", {
      default: "Espace personnel pour consulter vos réclamations et ouvrir les PDF associés.",
    }),
    primaryImageOfPage: `${APP_URL}/og/mes-reclamations.jpg`,
    breadcrumb,
  };

  return (
    <>
      <Script
        id="ldjson-claims"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MesReclamationsClient />
    </>
  );
}

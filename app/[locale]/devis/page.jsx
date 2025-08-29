import DevisClient from "./DevisClient";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata({ params: { locale } }) {
  // clés déjà présentes dans tes messages: auth.devis.seo
  const t = await getTranslations({ locale, namespace: "auth.devis.seo" });

  const title = t("title", {
    default: "Demander un devis – Ressorts de compression, traction & torsion | MTR Industry",
  });
  const description = t("description", {
    default:
      "Obtenez un devis rapide pour les ressorts de compression, traction, torsion, fil redressé et grilles métalliques.",
  });

  const url = `${APP_URL}/${locale}/devis`;
  const images = [
    {
      url: `${APP_URL}/og/devis.jpg`, // ajoute cette image (1200x630) dans /public/og/
      width: 1200,
      height: 630,
      alt: t("ogAlt", { default: "Demande de devis MTR Industry" }),
    },
  ];

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/devis`,
      languages: { fr: "/fr/devis", en: "/en/devis" },
    },
    keywords: [
      "devis ressort",
      "ressort compression",
      "ressort traction",
      "ressort torsion",
      "fil redressé",
      "grille métallique",
      "industrie",
    ],
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
    // Cette page est publique → on laisse index: true
    robots: { index: true, follow: true },
  };
}

export default async function Page({ params: { locale } }) {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: `${APP_URL}/${locale}` },
      { "@type": "ListItem", position: 2, name: locale === "fr" ? "Demande de devis" : "Request a quote", item: `${APP_URL}/${locale}/devis` },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Demander un devis – MTR Industry",
    description:
      "Formulaire multi-produits pour obtenir un devis sur ressorts et articles en fil métallique.",
    primaryImageOfPage: `${APP_URL}/og/devis.jpg`,
    breadcrumb,
  };

  return (
    <>
      <Script
        id="ldjson-devis"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DevisClient />
    </>
  );
}

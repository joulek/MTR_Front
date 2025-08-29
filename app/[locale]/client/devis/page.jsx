// app/[locale]/devis/page.jsx
import DevisClient from "./DevisClient";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: "auth.devis" });

  // Titres & descriptions
  const title = t("seo.title", { default: "Demander un devis – Ressorts compression, traction, torsion | MTR Industry" });
  const description = t("seo.description", {
    default:
      "Obtenez un devis rapide pour vos ressorts de compression, traction, torsion, fils dressés et grilles métalliques. Service sur mesure pour l’industrie.",
  });

  const url = `${APP_URL}/${locale}/devis`;
  const images = [
    {
      url: `${APP_URL}/og/devis.jpg`, // mets une image OG réelle si possible
      width: 1200,
      height: 630,
      alt: t("seo.ogAlt", { default: "Demande de devis MTR Industry" }),
    },
  ];

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/devis`,
      languages: {
        fr: "/fr/devis",
        en: "/en/devis",
      },
    },
    keywords: [
      "devis ressort",
      "ressort compression",
      "ressort traction",
      "ressort torsion",
      "fil dressé",
      "grille métallique",
      "MTR Industry",
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
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function Page() {
  // JSON-LD (schema.org) : Service + WebPage
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Demander un devis – MTR Industry",
    description:
      "Obtenez un devis rapide pour vos ressorts de compression, traction, torsion, fils dressés et grilles métalliques.",
    primaryImageOfPage: `${APP_URL}/og/devis.jpg`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${APP_URL}` },
        { "@type": "ListItem", position: 2, name: "Demander un devis", item: `${APP_URL}/devis` },
      ],
    },
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

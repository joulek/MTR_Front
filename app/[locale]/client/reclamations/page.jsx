// app/[locale]/client/reclamations/page.jsx
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

// on garde le composant client, mais la page elle-même reste "server component"
const ReclamationClient = dynamic(() => import("./ReclamationClient"));

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: "auth.client.reclamationForm.seo" });

  const title = t("title", { default: "Passer une réclamation – Espace client | MTR Industry" });
  const description = t("description", {
    default:
      "Soumettez une réclamation sur un devis, bon de commande, bon de livraison ou facture. Ajoutez des précisions et des pièces jointes.",
  });

  const url = `${APP_URL}/${locale}/client/reclamations`;
  const images = [
    {
      url: `${APP_URL}/og/reclamations.jpg`, // place cette image dans /public/og/
      width: 1200,
      height: 630,
      alt: t("ogAlt", { default: "Passer une réclamation – MTR Industry" }),
    },
  ];

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/client/reclamations`,
      languages: { fr: "/fr/client/reclamations", en: "/en/client/reclamations" },
    },
    openGraph: { type: "website", url, title, description, siteName: "MTR Industry", images, locale },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
    // Espace client : on n'indexe pas
    robots: { index: false, follow: false, noimageindex: true },
  };
}

export default async function Page({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: "auth.client.reclamationForm.seo" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t("title", { default: "Passer une réclamation – Espace client" }),
    description: t("description", {
      default:
        "Formulaire client pour créer une réclamation avec documents et pièces jointes.",
    }),
    primaryImageOfPage: `${APP_URL}/og/reclamations.jpg`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: `${APP_URL}/${locale}` },
        { "@type": "ListItem", position: 2, name: locale === "fr" ? "Espace client" : "Client area", item: `${APP_URL}/${locale}/client` },
        { "@type": "ListItem", position: 3, name: locale === "fr" ? "Passer une réclamation" : "Submit a claim", item: `${APP_URL}/${locale}/client/reclamations` },
      ],
    },
  };

  return (
    <>
      <Script
        id="ldjson-reclamations"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReclamationClient />
    </>
  );
}

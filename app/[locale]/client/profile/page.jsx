import ClientProfileReadOnly from "./ClientProfileReadOnly";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: "profile.seo" });

  const title = t("title", { default: "Mon compte – Espace client | MTR Industry" });
  const description = t("description", {
    default:
      "Accédez à vos informations de compte, vos coordonnées et vos raccourcis (réclamations, support, mot de passe).",
  });

  const url = `${APP_URL}/${locale}/client/profile`;
  const images = [
    { url: `${APP_URL}/og/client.jpg`, width: 1200, height: 630, alt: t("ogAlt", { default: "Espace client MTR Industry" }) }
  ];

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/client/profile`,
      languages: { fr: "/fr/client/profile", en: "/en/client/profile" },
    },
    openGraph: { type: "website", url, title, description, siteName: "MTR Industry", images, locale },
    twitter: { card: "summary_large_image", title, description, images: images.map(i => i.url) },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
  };
}

export default async function Page({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: "profile.seo" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t("title", { default: "Mon compte – Espace client" }),
    description: t("description", {
      default: "Accédez à vos informations de compte, vos coordonnées et vos raccourcis (réclamations, support, mot de passe).",
    }),
    primaryImageOfPage: `${APP_URL}/og/client.jpg`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: `${APP_URL}/${locale}` },
        { "@type": "ListItem", position: 2, name: locale === "fr" ? "Espace client" : "Client area", item: `${APP_URL}/${locale}/client/profile` }
      ],
    },
  };

  return (
    <>
      <Script id="ldjson-client" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ClientProfileReadOnly />
    </>
  );
}

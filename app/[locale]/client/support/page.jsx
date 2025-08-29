import SupportPageClient from "./SupportPageClient";
import { getTranslations } from "next-intl/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mtr-industry.tn";

export async function generateMetadata({ params }) {
  const t = await getTranslations({ locale: params.locale, namespace: "support.seo" });

  return {
    title: t("title"),          // ex: "Support – MTR Industry"
    description: t("description"),
    alternates: {
      canonical: `${SITE_URL}/${params.locale}/support`,
      languages: {
        fr: `${SITE_URL}/fr/support`,
        en: `${SITE_URL}/en/support`,
        ar: `${SITE_URL}/ar/support`,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `${SITE_URL}/${params.locale}/support`,
      siteName: "MTR Industry",
      type: "website",
      images: [{ url: `${SITE_URL}/og/support.jpg`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    robots: { index: true, follow: true },
  };
}

export default function Page() {
  return <SupportPageClient />;
}

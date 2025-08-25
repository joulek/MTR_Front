// app/[locale]/admin/categories/page.jsx
import AdminCategoriesPage from "./AdminCategoriesClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({ params }) {
  // ⬅️ ICI : on attend params avant d’en extraire locale
  const { locale } = await params;

  const title = "Gestion des catégories | Panneau d’administration";
  const description =
    "Interface d’administration pour gérer les catégories (création, édition, suppression).";
  const canonical = `${SITE_URL}/${locale}/admin/categories`;

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false },
    },
    alternates: {
      canonical,
      languages: {
        fr: `${SITE_URL}/fr/admin/categories`,
        en: `${SITE_URL}/en/admin/categories`,
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      siteName: "Panneau d’administration",
      images: [
        {
          url: `${SITE_URL}/og/admin-categories.png`,
          width: 1200,
          height: 630,
          alt: "Gestion des catégories",
        },
      ],
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/og/admin-categories.png`],
    },
    other: {
      "application-name": "Admin",
      "theme-color": "#0B1E3A",
    },
  };
}

export default function Page() {
  return <AdminCategoriesPage />;
}

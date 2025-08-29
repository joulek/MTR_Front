// app/[locale]/produits/[slug]/[productId]/page.jsx
// ⚠️ Server Component (pas de "use client")
import ProductDetailClient from "./ProductDetailClient";
import { getTranslations } from "next-intl/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mtr-industry.tn";
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000")
  .replace(/\/$/, "");
const API = `${BACKEND}/api`;

/* ---------- helpers ---------- */
const pick = (obj, frKey, enKey, locale = "fr") =>
  (locale?.startsWith("en") ? obj?.[enKey] : obj?.[frKey]) ||
  obj?.[frKey] ||
  obj?.[enKey] ||
  "";

function toUrl(src = "") {
  if (!src) return `${SITE_URL}/placeholder.png`;
  const s = String(src).replace(/\\/g, "/");
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith("/uploads/") ? s : `/uploads/${s.replace(/^\/+/, "")}`;
  return `${BACKEND}${path}`;
}

async function fetchProduct(productId) {
  // Essaie /produits/:id puis /products/:id (comme dans ton client)
  let res = await fetch(`${API}/produits/${productId}`, { next: { revalidate: 900 } });
  if (!res.ok) {
    res = await fetch(`${API}/produits/${productId}`, { next: { revalidate: 900 } });
  }
  if (!res.ok) return null;
  return res.json();
}

/* ---------- SEO ---------- */
export async function generateMetadata({ params }) {
  const { locale, slug, productId } = params;
  const t = await getTranslations({ locale, namespace: "seo.product" });

  const data = await fetchProduct(productId);

  const name = data ? pick(data, "name_fr", "name_en", locale) : productId;
  const descRaw = data ? pick(data, "description_fr", "description_en", locale) : "";
  const description = descRaw || t("descriptionFallback", { name });

  // Image OG (1re image si possible)
  const img0 =
    (Array.isArray(data?.images) && data.images[0]) ||
    "/og/product-default.jpg";
  const ogImage = toUrl(typeof img0 === "string" ? img0 : (img0.url || img0.src || img0.path || ""));

  const url = `${SITE_URL}/${locale}/produits/${slug}/${productId}`;
  const title = t("title", { name });

  return {
    title,
    description,
    keywords: t("keywords", { name }).split(",").map((s) => s.trim()),
    alternates: {
      canonical: url,
      languages: {
        fr: `${SITE_URL}/fr/produits/${slug}/${productId}`,
        en: `${SITE_URL}/en/produits/${slug}/${productId}`,
        ar: `${SITE_URL}/ar/produits/${slug}/${productId}`
      }
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "MTR Industry",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: t("ogAlt", { name })
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage]
    },
    robots: { index: true, follow: true }
  };
}

/* ---------- Page + JSON-LD Product ---------- */
export default async function Page({ params }) {
  const { locale, slug, productId } = params;
  const data = await fetchProduct(productId);

  const name = data ? pick(data, "name_fr", "name_en", locale) : productId;
  const desc = data ? pick(data, "description_fr", "description_en", locale) : "";

  const imgList = (Array.isArray(data?.images) && data.images.length
    ? data.images
    : ["/og/product-default.jpg"]
  ).map((it) => toUrl(typeof it === "string" ? it : (it.url || it.src || it.path || "")));

  // Offre (facultatif, seulement si prix dispo)
  const price = data?.price ?? data?.price_ttc ?? null;
  const currency = data?.currency ?? "TND";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: desc || undefined,
    sku: productId,
    image: imgList,
    brand: { "@type": "Brand", name: data?.brand || "MTR Industry" },
    category: String(slug || "").replace(/-/g, " "),
    ...(price
      ? {
          offers: {
            "@type": "Offer",
            price: String(price),
            priceCurrency: currency,
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/${locale}/produits/${slug}/${productId}`
          }
        }
      : {})
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient />
    </>
  );
}

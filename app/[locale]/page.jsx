"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  PhoneCall,
  Mail,
  MapPin,
  CheckCircle,
  Send,
  Facebook,
  Linkedin,
  ArrowUp,
  ChevronRight,
  Factory,
  Cog,
  Wrench,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

/* ---------------------------- API backend ---------------------------- */
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");
const API = `${BACKEND}/api`;

/* --------------------------- Helpers --------------------------- */
function slugify(s = "") {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

/* ---------- Anim helpers (révélations entre sections) ---------- */
const vSection = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const vStagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const vItemUp = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};
const vLeft  = { hidden: { opacity: 0, x: -30 }, show: { opacity: 1, x: 0, transition: { duration: .55 } } };
const vRight = { hidden: { opacity: 0, x:  30 }, show: { opacity: 1, x: 0, transition: { duration: .55 } } };
const vZoom  = { hidden: { opacity: 0, scale: .96 }, show: { opacity: 1, scale: 1, transition: { duration: .6 } } };

/* ---------- Label flottant (commun aux 4 champs) ---------- */
const labelFloat =
  "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-slate-500 " +
  "transition-all duration-150 " +
  "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 " +
  "peer-focus:-top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-[#F5B301] " +
  "peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs";

/* =============================== PAGE =============================== */
export default function HomeMTR() {
  const [form, setForm] = useState({ nom: "", email: "", sujet: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const yearsExp = new Date().getFullYear() - 1994;
  const [locale, setLocale] = useState("fr");
  const router = useRouter();

  // détecte la langue html/navigateur → fr|en
  useEffect(() => {
    const pick = () => {
      const htmlLang = document?.documentElement?.lang || "";
      const navLang = navigator?.language || "";
      const l = (htmlLang || navLang || "fr").toLowerCase();
      setLocale(l.startsWith("en") ? "en" : "fr");
    };
    pick();
    const el = document.documentElement;
    const mo = new MutationObserver(pick);
    mo.observe(el, { attributes: true, attributeFilter: ["lang"] });
    return () => mo.disconnect();
  }, []);

  /* ------------------ Récupération des catégories ------------------ */
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingCats(true);
        const res = await fetch(`${API}/categories`, { method: "GET", cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setCategories(Array.isArray(data?.categories) ? data.categories : []);
      } catch (err) {
        if (alive) setCategories([]);
      } finally {
        if (alive) setLoadingCats(false);
      }
    })();
    return () => { alive = false; if (!controller.signal.aborted) controller.abort(); };
  }, []);

  /* --------------------------- Helpers i18n --------------------------- */
  const pickName = (cat, loc) =>
    (cat?.translations && (cat.translations[loc] || cat.translations.fr || cat.translations.en)) ||
    cat?.label || "";

  const submitContact = async (e) => {
    e.preventDefault();
    setOkMsg(""); setErrMsg(""); setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/contact`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data?.message || `Erreur ${res.status}`);
      setOkMsg("✅ Votre message a été envoyé !");
      setForm({ nom: "", email: "", sujet: "", message: "" });
    } catch (err) {
      setErrMsg("❌ " + (err.message || "Impossible d’envoyer le message"));
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------- Petits composants --------------------------- */
  function AutoCarousel({ images = [], interval = 4000 }) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
      if (images.length <= 1 || paused) return;
      const t = setInterval(() => setIndex(i => (i + 1) % images.length), interval);
      return () => clearInterval(t);
    }, [images.length, interval, paused]);

    const go = (dir) => setIndex(i => (i + (dir === "next" ? 1 : -1) + images.length) % images.length);

    return (
      <div
        className="relative h-[420px] overflow-hidden rounded-3xl shadow-xl md:h-[560px] select-none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {images.map((src, i) => (
          <div key={src} className="absolute inset-0">
            <Image
              src={src}
              alt={`Slide ${i + 1}`}
              fill
              sizes="(max-width:768px) 100vw, 40vw"
              priority={i === 0}
              className={`object-cover transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}
            />
          </div>
        ))}

        {images.length > 1 && (
          <>
            <button
              onClick={() => go("prev")}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 px-3 py-2 text-white backdrop-blur hover:bg-black/50"
              aria-label="Précédent"
            >‹</button>
            <button
              onClick={() => go("next")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 px-3 py-2 text-white backdrop-blur hover:bg-black/50"
              aria-label="Suivant"
            >›</button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-2.5 w-2.5 rounded-full ring-1 ring-white/60 ${i === index ? "bg-[#F5B301]" : "bg-white/50 hover:bg-white/80"}`}
                aria-label={`Aller au slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  function CategoryTilePro({ title, imgUrl, alt, href }) {
    return (
      <Link href={href} className="group relative block h-[340px] overflow-hidden rounded-2xl shadow-lg">
        <img src={imgUrl} alt={alt || title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {/* Petit label coin bas quand pas hover */}
        <div className="absolute inset-x-0 bottom-0 p-3 transition-opacity duration-300 group-hover:opacity-0">
          <span className="inline-block rounded-md bg-black/60 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            {title}
          </span>
        </div>
        {/* Cartouche complète + CTA au hover */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="relative w-[86%] max-w-[520px]">
            <div className="rounded-xl bg-white px-8 py-6 text-center shadow-2xl ring-1 ring-black/5">
              <div className="text-[11px] font-extrabold uppercase tracking-[.12em] text-[#F5B301]">MTR</div>
              <h3 className="mt-2 text-2xl font-extrabold leading-snug text-slate-900">{title}</h3>
            </div>
            <div className="-mt-3 flex justify-center">
              <div className="inline-flex min-w-[280px] items-center justify-center rounded-xl bg-[#F5B301] px-6 py-4 shadow-xl">
                <span className="pointer-events-none text-sm font-extrabold uppercase tracking-wide text-[#0B2239] underline underline-offset-4">
                  View Detail →
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  function FeaturedCategory({ title, imgUrl, alt, href }) {
    return (
      <Link href={href} className="group relative row-span-2 block h-[460px] overflow-hidden rounded-2xl shadow-xl">
        <img src={imgUrl} alt={alt || title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex h-full items-center justify-center">
          <div className="rounded-xl bg-white px-8 py-7 text-center shadow-2xl ring-1 ring-black/5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#F5B301]">Industrie</div>
            <h3 className="mt-2 text-2xl font-extrabold text-slate-900 leading-snug">{title}</h3>
            <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#F5B301] px-5 py-2.5 font-semibold text-[#0B2239] shadow">
              Voir détail <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  /* -------------------------------- RENDER -------------------------------- */
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <SiteHeader />

      {/* HERO (fade-in au chargement) */}
      <section
        id="accueil"
        className="relative -mt-10 min-h-[86vh] flex items-center justify-center bg-cover bg-center md:bg[center_top] text-white"
        style={{ backgroundImage: "url('/hero.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { duration: .7 } }}
          className="relative z-10 mx-auto max-w-4xl px-4 py-32 text-center"
        >
          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
            Ressorts industriels & solutions de traction
          </h1>
          <p className="mt-6 text-lg text-gray-200 md:text-xl">
            Qualité, précision, fiabilité – MTR conçoit et fabrique vos ressorts sur mesure.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full bg-[#F5B301] px-6 py-3 font-semibold text-[#0B2239] hover:brightness-95"
            >
              Contact rapide
            </button>
            <button
              onClick={() => document.getElementById("specialites")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full border border-[#F5B301] px-6 py-3 font-semibold text-[#F5B301] hover:bg-[#F5B301] hover:text-[#0B2239]"
            >
              Nos spécialités
            </button>
          </div>
        </motion.div>
      </section>

      {/* PRÉSENTATION */}
      <motion.section
        id="presentation"
        className="bg-white py-16 md:py-24"
        variants={vSection}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.2 }}
      >
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            className="grid gap-12 md:grid-cols-5"
            variants={vStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, amount: .2 }}
          >
            <motion.div className="md:col-span-2" variants={vItemUp}>
              <div className="sticky top-24">
                <AutoCarousel images={["/about.jpg", "/photo_home.jpg", "/hero.jpg"]} />
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-3 ">
                    <div className="text-2xl font-extrabold text-[#0B2239]">{yearsExp}</div>
                    <div className="text-[11px] uppercase text-slate-500">Années</div>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-3">
                    <div className="text-2xl font-extrabold text-[#0B2239]">0,1–10</div>
                    <div className="text-[11px] uppercase text-slate-500">Fil (mm)</div>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-3">
                    <div className="text-2xl font-extrabold text-[#0B2239]">2D/3D</div>
                    <div className="text-[11px] uppercase text-slate-500">Grilles</div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div className="md:col-span-3" variants={vItemUp}>
              <motion.div className="mb-8" variants={vItemUp}>
                <h2 className="text-3xl font-extrabold text-[#0B2239] md:text-5xl">
                  La qualité à chaque ressort, la fiabilité à chaque pas.
                </h2>
                <div className="mt-4 h-1 w-20 rounded-full bg-[#F5B301]" />
              </motion.div>

              <motion.div className="grid gap-6" variants={vStagger}>
                <motion.article variants={vItemUp} className="rounded-3xl border-2 border-[#F4D06F] bg-white p-6 shadow-sm transition hover:shadow-lg hover:shadow-[#F4D06F]/20">
                  <h3 className="mb-2 text-lg font-bold text-[#0B2239]">Fondation & activité</h3>
                  <p className="leading-relaxed text-slate-700">
                    Fondée en 1994 par <strong>Monsieur Hbaieb Chokri</strong>, la
                    <strong> Manufacture Tunisienne des Ressorts (MTR)</strong> est une entreprise tunisienne de type SARL,
                    spécialisée depuis plus de 30 ans dans la conception et la fabrication de ressorts : ressorts de
                    <strong> compression</strong>, de <strong>traction</strong>, de <strong>torsion</strong> et de <strong>forme</strong>.
                  </p>
                </motion.article>

                <motion.article variants={vItemUp} className="rounded-3xl border-2 border-[#F5B301] bg-white p-6 shadow-sm">
                  <h3 className="mb-2 text-lg font-bold text-[#0B2239]">Savoir-faire & qualité</h3>
                  <p className="leading-relaxed text-slate-700">
                    Forte d’un savoir-faire éprouvé et d’une maîtrise technique reconnue, MTR propose des
                    <strong> solutions sur mesure</strong>, adaptées aux besoins les plus exigeants.
                  </p>
                  <p className="mt-3 leading-relaxed text-slate-700">
                    L’entreprise réalise des ressorts en fils métalliques de <strong>0,1 mm à 10 mm</strong> de diamètre,
                    en <strong>petites ou grandes séries</strong>, selon les standards du client ou sur cahier des charges.
                  </p>
                </motion.article>

                <motion.article variants={vItemUp} className="rounded-3xl border-2 border-[#F5B301] bg-white p-6 shadow-sm">
                  <h3 className="mb-2 text-lg font-bold text-[#0B2239]">Travail du fil & secteurs servis</h3>
                  <p className="leading-relaxed text-slate-700">
                    Dressage & coupe (1–12 mm), cintrage 2D/3D, grilles/cadres soudés, pièces techniques ou décoratives.
                  </p>
                </motion.article>
              </motion.div>

              <motion.div className="mt-8 grid gap-3 sm:grid-cols-2" variants={vStagger}>
                {[
                  "Fils 0,1 mm à 10 mm",
                  "Séries petites à grandes",
                  "Études & prototypage rapides",
                  "Contrôle qualité interne",
                ].map((t) => (
                  <motion.div key={t} variants={vItemUp} className="flex items-center gap-2 text-sm font-medium text-[#0B2239]">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#F5B301]" /> {t}
                  </motion.div>
                ))}
              </motion.div>

              <motion.div className="mt-8 flex flex-wrap gap-4" variants={vItemUp}>
                <a href="#specialites" className="rounded-full bg-[#F5B301] px-6 py-3 font-semibold text-[#0B2239] shadow hover:brightness-95">
                  Voir nos produits
                </a>
                <a href="#contact" className="rounded-full border border-[#0B2239] px-6 py-3 font-semibold text-[#0B2239] hover:bg-[#0B2239] hover:text-white">
                  À propos de nous
                </a>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* SPÉCIALITÉS */}
      <motion.section
        id="specialites"
        className="bg-slate-50 py-16 md:py-24"
        variants={vSection}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.2 }}
      >
        <div className="mx-auto max-w-7xl px-4">
          <motion.div className="mb-12 text-center" variants={vItemUp}>
            <h2 className="text-3xl font-extrabold text-[#0B2239] md:text-4xl">Nos spécialités</h2>
            <p className="mt-3 text-slate-600">
              MTR propose ses services commerciaux à partir d'une gamme très diversifiée de produits industriels de haute qualité.
            </p>
          </motion.div>

          {loadingCats && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[200px] rounded-2xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          )}

          {!loadingCats && categories.length > 0 && (() => {
            const count = categories.length;
            const gridCols = count === 4 ? "sm:grid-cols-2 lg:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
            return (
              <motion.div className={`grid gap-6 ${gridCols}`} variants={vStagger} initial="hidden" whileInView="show" viewport={{ once:false, amount:.15 }}>
                {categories.map((c) => {
                  const title = pickName(c, locale);
                  const raw = c?.image?.url || "";
                  const imgUrl = raw.startsWith("http") ? raw : `${BACKEND}${raw.startsWith("/") ? "" : "/"}${raw}`;
                  const alt = c?.image?.[`alt_${locale}`] || c?.image?.alt_fr || title;
                  const slug = c?.slug || slugify(title);
                  const href = `/${locale}/produits/${slug}`;
                  return (
                    <motion.div key={c._id || title} variants={vItemUp}>
                      <CategoryTilePro title={title} imgUrl={imgUrl} alt={alt} href={href} />
                    </motion.div>
                  );
                })}
              </motion.div>
            );
          })()}

          {!loadingCats && categories.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Aucune catégorie pour le moment.
            </div>
          )}
        </div>
      </motion.section>

      {/* A PROPOS — Résumé */}
      <motion.section
        id="apropos"
        className="relative bg-white py-16 md:py-24"
        variants={vSection}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.2 }}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_15%_10%,rgba(245,179,1,0.06),transparent),radial-gradient(60%_40%_at_85%_80%,rgba(11,34,57,0.05),transparent)]" />
        <div className="mx-auto max-w-7xl px-4">
          <motion.div className="mx-auto mb-16 md:mb-20 max-w-3xl text-center" variants={vItemUp}>
            <h2 className="text-3xl font-extrabold text-[#0B2239] md:text-4xl">À propos de MTR</h2>
            <p className="mt-3 text-slate-600">L’essentiel en trois points : capacités, qualité et travail du fil.</p>
          </motion.div>

          <motion.div className="grid gap-6 md:grid-cols-3 -mt-6 md:-mt-10" variants={vStagger}>
            <motion.article variants={vItemUp} className="group relative rounded-3xl border border-[#F5B301] bg-white p-6 shadow-sm transition hover:shadow-xl">
              <div className="mb-4 inline-flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B2239]/5">
                  <Factory className="h-5 w-5 text-[#F5B301]" />
                </span>
                <h3 className="text-xl font-bold text-[#0B2239] ">Fondation & activité</h3>
              </div>
              <ul className="mx-auto max-w-sm space-y-2 text-slate-700">
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 text-[#F5B301]" /><span>Ressorts & pièces en fil métallique (proto → série)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 text-[#F5B301]" /><span>Fils 0,1–10&nbsp;mm, fabrication sur plan / cahier des charges</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 text-[#F5B301]" /><span>{yearsExp}+ ans d’expérience industrielle</span></li>
              </ul>
            </motion.article>

            <motion.article variants={vItemUp} className="group relative rounded-3xl border border-[#F5B301] bg-white p-6 shadow-sm transition hover:shadow-xl">
              <div className="mb-4 inline-flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B2239]/5">
                  <Cog className="h-5 w-5 text-[#F5B301]" />
                </span>
                <h3 className="text-xl font-bold text-[#0B2239]">Savoir-faire & qualité</h3>
              </div>
              <ul className="mx-auto max-w-sm space-y-2 text-slate-700">
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 text-[#F5B301]" /><span>Études & co-design, prototypage rapide</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 text-[#F5B301]" /><span>Tolérances maîtrisées, essais charge/dimension</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 text-[#F5B301]" /><span>Traçabilité complète matière & process</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 text-[#F5B301]" /><span>Petites → grandes séries, délais courts</span></li>
              </ul>
            </motion.article>

            <motion.article variants={vItemUp} className="group relative rounded-3xl border border-[#F5B301] bg-white p-6 shadow-sm transition hover:shadow-xl">
              <div className="mb-4 inline-flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B2239]/5">
                  <Wrench className="h-5 w-5 text-[#F5B301]" />
                </span>
                <h3 className="text-xl font-bold text-[#0B2239]">Travail du fil & secteurs servis</h3>
              </div>
              <ul className="mx-auto max-w-sm space-y-2 text-slate-700">
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 text-[#F5B301]" /><span>Dressage & coupe 1–12&nbsp;mm, cintrage 2D/3D</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 text-[#F5B301]" /><span>Grilles, cadres, formes et ensembles soudés</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 text-[#F5B301]" /><span>Finitions : zingage, peinture, traitement thermique</span></li>
              </ul>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {["Automobile","Électroménager","Agriculture","Électricité","Bâtiment","Sports & loisirs"].map((t) => (
                  <span key={t} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">{t}</span>
                ))}
              </div>
            </motion.article>
          </motion.div>
        </div>
      </motion.section>

      {/* CONTACT */}
      <motion.section
        id="contact"
        className="relative overflow-hidden bg-slate-50 py-20"
        variants={vSection}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.2 }}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_15%_10%,rgba(245,179,1,0.08),transparent),radial-gradient(60%_40%_at_85%_80%,rgba(11,34,57,0.06),transparent)]" />
        <div className="mx-auto max-w-7xl px-4">
          <motion.div className="mx-auto mb-12 max-w-3xl text-center" variants={vItemUp}>
            <h2 className="text-4xl font-extrabold text-[#0B2239]">Parlons de votre projet</h2>
            <p className="mt-3 text-slate-600">Une question technique, un devis ou un prototype à lancer ? Notre équipe vous répond rapidement.</p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            <motion.div className="md:col-span-2" variants={vLeft}>
              <form onSubmit={submitContact} className="group rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-slate-200 backdrop-blur">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="relative">
                    <input id="nom" name="nom" autoComplete="name" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="peer w-full rounded-2xl border border-slate-300 bg-transparent px-4 py-4 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2" placeholder=" " required />
                    <label htmlFor="nom" className={labelFloat}>Nom complet</label>
                  </div>
                  <div className="relative">
                    <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="peer w-full rounded-2xl border border-slate-300 bg-transparent px-4 py-4 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2" placeholder=" " required />
                    <label htmlFor="email" className={labelFloat}>E-mail</label>
                  </div>
                  <div className="relative sm:col-span-2">
                    <input id="sujet" name="sujet" value={form.sujet} onChange={(e) => setForm({ ...form, sujet: e.target.value })} className="peer w-full rounded-2xl border border-slate-300 bg-transparent px-4 py-4 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2" placeholder=" " required />
                    <label htmlFor="sujet" className={labelFloat}>Sujet</label>
                  </div>
                  <div className="relative sm:col-span-2">
                    <textarea id="message" name="message" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="peer w-full resize-none rounded-2xl border border-slate-300 bg-transparent px-4 py-4 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2" placeholder=" " required />
                    <label htmlFor="message" className={labelFloat}>Message</label>
                  </div>
                </div>

                {okMsg && <p className="mt-4 text-green-600">{okMsg}</p>}
                {errMsg && <p className="mt-4 text-red-600">{errMsg}</p>}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <CheckCircle className="h-5 w-5 text-[#F5B301]" />
                    <span>Réponse sous 24h ouvrées</span>
                  </div>
                  <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-[#F5B301] px-7 py-3 font-semibold text-[#0B2239] shadow hover:brightness-95 disabled:opacity-60">
                    {loading ? "Envoi..." : "Envoyer"} <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </motion.div>

            <motion.div className="grid gap-5" variants={vRight}>
              <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-[#0B2239]/5 p-3"><PhoneCall className="h-5 w-5 text-[#F5B301]" /></div>
                  <div>
                    <p className="text-sm text-slate-500">Téléphone</p>
                    <p className="font-semibold text-[#0B2239]">+216 00 000 000</p>
                    <a href="tel:+21600000000" className="mt-3 inline-block rounded-full border border-[#F5B301] px-4 py-2 text-sm font-semibold text-[#0B2239] hover:bg-[#F5B301] hover:text-[#0B2239]">Appeler</a>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-[#0B2239]/5 p-3"><Mail className="h-5 w-5 text-[#F5B301]" /></div>
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-semibold text-[#0B2239]">contact@mtr.tn</p>
                    <a href="mailto:contact@mtr.tn" className="mt-3 inline-block rounded-full border border-[#F5B301] px-4 py-2 text-sm font-semibold text-[#0B2239] hover:bg-[#F5B301] hover:text-[#0B2239]">Écrire</a>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-[#0B2239]/5 p-3"><MapPin className="h-5 w-5 text-[#F5B301]" /></div>
                  <div>
                    <p className="text-sm text-slate-500">Adresse</p>
                    <p className="font-semibold text-[#0B2239]">Z.I. Sfax, Tunisie</p>
                    <a href="#localisation" className="mt-3 inline-block rounded-full border border-[#F5B301] px-4 py-2 text-sm font-semibold text-[#0B2239] hover:bg-[#F5B301] hover:text-[#0B2239]">Voir sur la carte</a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* LOCALISATION */}
      <motion.section
        id="localisation"
        className="relative bg-white py-16 md:py-24"
        variants={vSection}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.25 }}
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(245,179,1,0.08),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(11,34,57,0.08),transparent_40%)]" />
        <div className="mx-auto max-w-7xl px-4">
          <motion.div className="mb-8 text-center" variants={vItemUp}>
            <h2 className="text-3xl font-extrabold text-[#0B2239] md:text-4xl">Où nous trouver</h2>
            <p className="mt-3 text-slate-600">Usine MTR — Sfax, Tunisie</p>
          </motion.div>
          <motion.div variants={vZoom} className="relative overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200">
            <iframe
              title="Localisation MTR"
              src="https://www.google.com/maps?q=34.8256683,10.7390825&hl=fr&z=18&output=embed"
              className="h-[70vh] w-full md:h-[75vh]"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              href="https://www.google.com/maps/place/Manufacture+MTR/"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 left-4 rounded-full bg-[#F5B301] px-5 py-2 font-semibold text-[#0B2239] shadow-lg hover:brightness-95"
            >
              Ouvrir dans Google Maps
            </a>
          </motion.div>
        </div>
      </motion.section>

      {/* FOOTER */}
      <footer className="relative mt-0 bg-[#0B2239] text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_10%,rgba(255,255,255,0.05),transparent),radial-gradient(50%_40%_at_80%_60%,rgba(245,179,1,0.08),transparent)]" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 md:grid-cols-4">
          <div>
            <h4 className="text-xl font-extrabold">MTR</h4>
            <p className="mt-3 max-w-xs text-sm text-white/80">
              Manufacture Tunisienne des Ressorts — qualité, précision et fiabilité depuis 1994.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a href="https://www.facebook.com/profile.php?id=100076355199317&locale=fr_FR" target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://www.linkedin.com/in/manufacutre-tunisienne-des-ressorts-22b388276/" target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="https://wa.me/21698333883" target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 p-2 hover:bg-white/20" title="WhatsApp : +216 98 333 883">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-500" fill="currentColor">
                  <path d="M20.52 3.48A11.9 11.9 0 0012 .07 11.93 11.93 0 001.6 17.93L.07 24l6.2-1.63A11.93 11.93 0 0012 23.84h.01C18.6 23.84 24 18.48 24 11.9c0-3.2-1.25-6.2-3.48-8.42zM12 21.5c-1.9 0-3.73-.5-5.34-1.46l-.38-.23-3.67.97.98-3.58-.25-.37A9.93 9.93 0 1122 11.9c0 5.5-4.48 9.6-10 9.6zm5.14-7.44c-.28-.14-1.64-.8-1.9-.9-.26-.1-.45-.14-.64.14-.19.27-.73.9-.9 1.09-.17.19-.34.21-.62.07-.28-.14-1.17-.43-2.23-1.36-.82-.73-1.37-1.64-1.53-1.91-.16-.27-.02-.42.12-.55.12-.12.28-.32.42-.48.14-.16.19-.27.28-.46.09-.19.05-.35-.02-.48-.07-.14-.64-1.55-.88-2.13-.23-.56-.47-.49-.64-.5h-.55c-.19 0-.5.07-.76.35-.26.27-1 1-1 2.43 0 1.43 1.03 2.82 1.18 3.01.14.19 2.03 3.09 4.93 4.33.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.64-.67 1.87-1.32.23-.65.23-1.21.16-1.32-.07-.12-.26-.19-.54-.33z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h5 className="text-lg font-semibold">Company</h5>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              {[{ label: "À propos", href: "#presentation" }, { label: "Produits", href: "#specialites" }, { label: "Demande de devis", href: "#contact" }].map((l, i) => (
                <li key={i}>
                  <a href={l.href} className="group inline-flex items-center gap-2 hover:text-[#F5B301]">
                    <ChevronRight className="h-4 w-4 opacity-60 transition group-hover:text-[#F5B301]" />
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="text-lg font-semibold">Ressources</h5>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              {[{ label: "Help Desk", href: "#contact" }, { label: "Catalogue", href: "#specialites" }, { label: "Contact", href: "#contact" }].map((l, i) => (
                <li key={i}>
                  <a href={l.href} className="group inline-flex items-center gap-2 hover:text-[#F5B301]">
                    <ChevronRight className="h-4 w-4 opacity-60 transition group-hover:text-[#F5B301]" />
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="text-lg font-semibold">S’abonner à la newsletter</h5>
            <p className="mt-3 text-sm text-white/80">Recevez nos nouveautés produits et conseils techniques.</p>
            <form onSubmit={(e) => e.preventDefault()} className="mt-4 flex gap-2">
              <input type="email" placeholder="Votre e-mail" className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60 outline-none focus:border-[#F5B301]" />
              <button className="rounded-full bg-[#F5B301] px-5 py-3 text-sm font-semibold text-[#0B2239]">S’abonner</button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-sm text-white/80 md:flex-row">
            <p>© {new Date().getFullYear()} MTR. Tous droits réservés.</p>
            <div className="flex items-center gap-4">
              <a href="#apropos" className="hover:text-[#F5B301]">À propos</a>
              <a href="#contact" className="hover:text-[#F5B301]">Help Desk</a>
              <a href="#" className="hover:text-[#F5B301]">Privacy Policy</a>
            </div>
          </div>
        </div>

        <a
          href="#accueil"
          className="fixed bottom-6 right-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#F5B301] text-[#0B2239] shadow-xl ring-1 ring-black/10 transition hover:-translate-y-0.5"
          aria-label="Revenir en haut"
        >
          <ArrowUp className="h-5 w-5" />
        </a>
      </footer>
    </div>
  );
}

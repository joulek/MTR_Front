// components/SiteHeader.jsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Facebook, Linkedin, MoreVertical, User, LogOut } from "lucide-react";
import { CircleFlag } from "react-circle-flags";

/* ---------------------------- API backend ---------------------------- */
const BACKEND = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
).replace(/\/$/, "");
const API = `${BACKEND}/api`;

/* --------------------------- Helpers --------------------------- */
function pickName(cat, locale) {
  return (
    (cat?.translations &&
      (cat.translations[locale] ||
        cat.translations.fr ||
        cat.translations.en)) ||
    cat?.label ||
    ""
  );
}
function slugify(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
const makeCatHref = (cat, locale) =>
  `/${locale}/produits/${cat?.slug || slugify(pickName(cat, locale))}`;

function swapLocaleInPath(path, nextLocale) {
  const [p, q] = (path || "/").split("?");
  let base = p || "/";
  if (/^\/(fr|en)(\/|$)/.test(base)) {
    base = base.replace(/^\/(fr|en)(?=\/|$)/, `/${nextLocale}`);
  } else if (base === "/") {
    base = `/${nextLocale}`;
  } else {
    base = `/${nextLocale}${base}`;
  }
  return q ? `${base}?${q}` : base;
}

export default function SiteHeader({ mode = "public", onLogout }) {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState("fr");
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [me, setMe] = useState(null);
  const [hintRole, setHintRole] = useState(() => {
    try {
      return localStorage.getItem("mtr_role") || null;
    } catch {
      return null;
    }
  });

  const router = useRouter();
  const pathname = usePathname() || "/";
  const homePaths = ["/", "/fr", "/en", "/fr/", "/en/"];
  const isHome = homePaths.includes(pathname);

  /* langue */
  useEffect(() => {
    const pick = () => {
      const htmlLang = document?.documentElement?.lang || "";
      const navLang = navigator?.language || "";
      const l = (htmlLang || navLang || "fr").toLowerCase();
      setLocale(l.startsWith("en") ? "en" : "fr");
    };
    pick();
    const mo = new MutationObserver(pick);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    return () => mo.disconnect();
  }, []);

  /* session (⇐ BACKEND /api/me, pas /api/me côté Next) */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API}/users/me`, { credentials: "include", cache: "no-store" });
        if (!alive) return;
        if (r.ok) {
          const json = await r.json();
          setMe(json);
          if (process.env.NODE_ENV !== "production")
            console.log("[SiteHeader] session:", json);
          if (json?.role) {
            try {
              localStorage.setItem("mtr_role", json.role);
            } catch { }
            setHintRole(json.role);
          }
        } else {
          setMe(null);
          setHintRole(null);
          try {
            localStorage.removeItem("mtr_role");
          } catch { }
        }
      } catch (e) {
        setMe(null);
        setHintRole(null);
        try {
          localStorage.removeItem("mtr_role");
        } catch { }
        if (process.env.NODE_ENV !== "production")
          console.warn("[SiteHeader] /me error:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ⚙️ État “client connecté” : UNIQUEMENT session (me) ou override explicite */
  const isLoggedClient = mode === "client" || me?.role === "client";

  /* home href (plus de ?client=1) */
  const homeHref = `/${locale}`;

  /* catégories */
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingCats(true);
        const res = await fetch(`${API}/categories`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setCategories(Array.isArray(data?.categories) ? data.categories : []);
      } catch {
        if (alive) setCategories([]);
      } finally {
        if (alive) setLoadingCats(false);
      }
    })();
    return () => {
      alive = false;
      if (!controller.signal.aborted) controller.abort();
    };
  }, []);

  /* scroll vers section home (SANS hash) */
  const goToSection = useCallback(
    async (id, closeMenu) => {
      const doScroll = () => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        if (location.hash)
          history.replaceState(null, "", location.pathname + location.search);
        if (closeMenu) setOpen(false);
      };
      if (!homePaths.includes(pathname)) {
        await router.push(homeHref, { scroll: true });
        setTimeout(doScroll, 60);
      } else {
        doScroll();
      }
    },
    [pathname, router, homeHref]
  );

  /* switch langue */
  const switchLang = useCallback(
    (next) => {
      if (next === locale) return;
      document.documentElement.lang = next;
      setLocale(next);
      const nextPath = swapLocaleInPath(pathname, next);
      router.push(nextPath, { scroll: false });
      try {
        localStorage.setItem("mtr_locale", next);
      } catch { }
    },
    [pathname, router, locale]
  );

  /* sync multi-onglets (optionnel) */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "mtr_role" && e.newValue == null) {
        setMe(null);
        setHintRole(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ======================= Sous-composants ======================= */

  const ProductsMenu = ({ cats, locale }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [hoveredParent, setHoveredParent] = useState(null);
    const childrenMap = new Map();
    const getParentId = (c) =>
      c?.parent?._id || c?.parent || c?.parentId || c?.parent_id || null;
    const getId = (c) => c?._id || pickName(c, locale);

    cats.forEach((c) => {
      const pid = getParentId(c);
      if (!pid) return;
      const arr = childrenMap.get(pid) || [];
      arr.push(c);
      childrenMap.set(pid, arr);
    });
    const tops = cats.filter((c) => !getParentId(c));

    return (
      <div
        className="relative"
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => {
          setMenuOpen(false);
          setHoveredParent(null);
        }}
      >
        <button
          type="button"
          className="group relative px-3 py-2 text-sm font-semibold text-[#0B2239] hover:text-[#F5B301]"
          aria-haspopup="true"
          aria-expanded={menuOpen ? "true" : "false"}
        >
          Produits <span className="ml-1">▾</span>
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full z-50 before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-2">
            <ul className="relative w-64 rounded-lg bg-white p-2 shadow-2xl ring-1 ring-slate-200 after:content-[''] after:absolute after:top-0 after:right-[-8px] after:w-2 after:h-full">
              {tops.map((parent) => {
                const id = getId(parent);
                const label = pickName(parent, locale);
                const hasChildren = !!childrenMap.get(id);
                const active = hoveredParent === id;
                return (
                  <li key={id}>
                    <Link
                      href={makeCatHref(parent, locale)}
                      onMouseEnter={() => setHoveredParent(id)}
                      className={`flex items-center justify-between rounded-md px-4 py-3 text-sm transition
                        ${active
                          ? "bg-[#F5B301] text-[#0B2239]"
                          : "text-[#0B2239] hover:bg-[#F5B301] hover:text-[#0B2239]"
                        }`}
                    >
                      {label}
                      {hasChildren ? (
                        <span className="ml-3 text-xs opacity-70">›</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {hoveredParent &&
              (childrenMap.get(hoveredParent) || []).length > 0 && (
                <ul className="absolute left-[100%] top-0 ml-2 w-64 rounded-lg bg-white p-2 shadow-2xl ring-1 ring-slate-200">
                  {(childrenMap.get(hoveredParent) || []).map((child) => (
                    <li key={getId(child)}>
                      <Link
                        href={makeCatHref(child, locale)}
                        className="block rounded-md px-4 py-3 text-sm text-[#0B2239] hover:bg-slate-50"
                      >
                        {pickName(child, locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}
      </div>
    );
  };

  /* --------- NAV items pour client --------- */
  const ClientNavItemsDesktop = () => {
    const [servicesOpen, setServicesOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      const onDoc = (e) => {
        if (!ref.current?.contains(e.target)) setServicesOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    return (
      <>
        <Link
          href={`/${locale}/client/reclamations`}
          className="px-3 py-2 text-sm font-semibold text-[#0B2239] hover:text-[#F5B301]"
        >
          Réclamer
        </Link>

        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setServicesOpen((s) => !s)}
            className="px-3 py-2 text-sm font-semibold text-[#0B2239] hover:text-[#F5B301]"
            aria-haspopup="menu"
            aria-expanded={servicesOpen}
          >
            Mes services ▾
          </button>
          {servicesOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg z-50"
            >
              <Link
                href={`/${locale}/client/mes-devis`}
                role="menuitem"
                className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Mes demandes devis
              </Link>
              <Link
                href={`/${locale}/client/mes-reclamations`}
                role="menuitem"
                className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Mes réclamations
              </Link>
            </div>
          )}
        </div>

        <Link
          href={`/${locale}/client/devis`}
          className="px-3 py-2 text-sm font-semibold text-[#0B2239] hover:text-[#F5B301]"
        >
          Demander un devis
        </Link>
      </>
    );
  };

  const ClientNavItemsMobile = () => (
    <>
      <details>
        <summary className="px-3 py-2 cursor-pointer select-none">
          Mes services
        </summary>
        <div className="pl-4 flex flex-col">
          <Link
            href={`/${locale}/client/mes-devis`}
            className="px-3 py-2 rounded hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            Mes demandes devis
          </Link>
          <Link
            href={`/${locale}/client/mes-reclamations`}
            className="px-3 py-2 rounded hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            Mes réclamations
          </Link>
        </div>
      </details>
      <Link
        href={`/${locale}/client/devis`}
        className="rounded px-3 py-2 hover:bg-slate-50"
        onClick={() => setOpen(false)}
      >
        Demander un devis
      </Link>
    </>
  );

  /* --------- Menu utilisateur (icône 3 points) --------- */
  const UserMenu = () => {
    const [uOpen, setUOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      const onDoc = (e) => {
        if (!ref.current?.contains(e.target)) setUOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, []);
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setUOpen((s) => !s)}
          aria-label="Menu utilisateur"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-[#0B2239] hover:bg-slate-50"
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        {uOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-50">
            <Link
              href={`/${locale}/client/profile`}
              onClick={() => setUOpen(false)}
              className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              <User className="h-4 w-4" />
              Profil
            </Link>
            <button
              onClick={() => {
                setUOpen(false);
                (onLogout || handleLogout)();
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    );
  };

  /* Logout (fallback si onLogout non fourni) */
  async function handleLogout() {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    } catch (e) {
      console.error("Erreur logout", e);
    } finally {
      try {
        localStorage.removeItem("mtr_role");
        localStorage.removeItem("userRole");
        localStorage.removeItem("rememberMe");
      } catch { }
      setMe(null);
      setHintRole(null);
      router.replace(`/${locale}`);
    }
  }

  /* ======================= RENDER ======================= */
  return (
    <header className="sticky top-0 z-40">
      {/* top bar */}
      <div className="bg-[#0B2239] text-white">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-xs sm:text-sm">
          <nav className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => goToSection("apropos")}
              className="opacity-90 transition hover:text-[#F5B301]"
              role="link"
            >
              À propos
            </button>
            <span className="opacity-40">|</span>
            <Link
              href={`/${locale}/help-desk`}
              className="opacity-90 transition hover:text-[#F5B301]"
            >
              Help Desk
            </Link>

            <span className="opacity-40">|</span>
            <button
              type="button"
              onClick={() => goToSection("presentation")}
              className="opacity-90 transition hover:text-[#F5B301]"
              role="link"
            >
              Présentation
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://www.facebook.com/profile.php?id=100076355199317&locale=fr_FR"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white/10 p-1.5 hover:bg-white/20"
              aria-label="Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/manufacutre-tunisienne-des-ressorts-22b388276/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white/10 p-1.5 hover:bg-white/20"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={() => switchLang("fr")}
                className={`${locale === "fr" ? "ring-2 ring-[#F5B301] rounded-full" : ""
                  } px-2 py-1 bg-transparent border-0 text-sm font-semibold`}
                title="Français"
                aria-pressed={locale === "fr"}
              >
                FR
              </button>

              <button
                onClick={() => switchLang("en")}
                className={`${locale === "en" ? "ring-2 ring-[#F5B301] rounded-full" : ""
                  } px-2 py-1 bg-transparent border-0 text-sm font-semibold`}
                title="English"
                aria-pressed={locale === "en"}
              >
                US
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* barre principale */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            {/* logo → home */}
            <Link href={homeHref} className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="MTR logo"
                width={100}
                height={100}
                className="object-contain"
                priority
              />
            </Link>

            {/* nav desktop */}
            <nav className="hidden items-center gap-1 md:flex">
              <Link
                href={homeHref}
                className="px-3 py-2 text-sm font-semibold text-[#0B2239] hover:text-[#F5B301]"
              >
                Accueil
              </Link>

              {/* sections home : public partout / client seulement sur home */}
              {(!isLoggedClient || isHome) && (
                <>
                  <button
                    type="button"
                    onClick={() => goToSection("presentation")}
                    className="px-3 py-2 text-sm font-semibold text-[#0B2239] hover:text-[#F5B301]"
                    role="link"
                  >
                    L&apos;entreprise
                  </button>
                  {!loadingCats && (
                    <ProductsMenu cats={categories} locale={locale} />
                  )}
                  <button
                    type="button"
                    onClick={() => goToSection("contact")}
                    className="px-3 py-2 text-sm font-semibold text-[#0B2239] hover:text-[#F5B301]"
                    role="link"
                  >
                    Contact
                  </button>
                  <button
                    type="button"
                    onClick={() => goToSection("localisation")}
                    className="px-3 py-2 text-sm font-semibold text-[#0B2239] hover:text-[#F5B301]"
                    role="link"
                  >
                    Localisation
                  </button>
                </>
              )}

              {isLoggedClient && <ClientNavItemsDesktop />}
            </nav>

            {/* actions droite */}
            <div className="flex items-center gap-3">
              {isLoggedClient ? (
                <UserMenu />
              ) : (
                <>
                  {/* Se connecter */}
                  <Link
                    href={`/${locale}/login`}
                    className="hidden md:inline-block rounded-full bg-[#F5B301] px-4 py-2 text-sm font-semibold text-[#0B2239] shadow hover:brightness-95"
                  >
                    Se connecter
                  </Link>

                  {/* Demander un devis */}
                  <Link
                    href={`/${locale}/devis`}
                    className="hidden md:inline-block rounded-full bg-[#F5B301] px-4 py-2 text-sm font-semibold text-[#0B2239] shadow hover:brightness-95"
                  >
                    Demander un devis
                  </Link>
                </>
              )}

              {/* bouton hamburger pour le menu mobile global */}
              <button
                onClick={() => setOpen((s) => !s)}
                aria-label="Ouvrir le menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-[#0B2239] md:hidden"
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* menu mobile */}
        {open && (
          <div className="md:hidden border-top border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
              <Link
                href={homeHref}
                className="rounded px-3 py-2 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                Accueil
              </Link>

              {(!isLoggedClient || isHome) && (
                <>
                  <button
                    type="button"
                    onClick={() => goToSection("presentation", true)}
                    className="text-left rounded px-3 py-2 hover:bg-slate-50"
                    role="link"
                  >
                    L&apos;entreprise
                  </button>
                  <button
                    type="button"
                    onClick={() => goToSection("specialites", true)}
                    className="text-left rounded px-3 py-2 hover:bg-slate-50"
                    role="link"
                  >
                    Produits
                  </button>
                  <button
                    type="button"
                    onClick={() => goToSection("contact", true)}
                    className="text-left rounded px-3 py-2 hover:bg-slate-50"
                    role="link"
                  >
                    Contact
                  </button>
                  <button
                    type="button"
                    onClick={() => goToSection("localisation", true)}
                    className="text-left rounded px-3 py-2 hover:bg-slate-50"
                    role="link"
                  >
                    Localisation
                  </button>
                </>
              )}

              {!isLoggedClient && (
                <>
                  <Link
                    href={`/${locale}/devis`}
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-[#F5B301] px-4 py-2 text-center text-sm font-semibold text-[#0B2239] shadow hover:brightness-95"
                  >
                    Demander un devis
                  </Link>

                  <Link
                    href={`/${locale}/login`}
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-[#F5B301] px-4 py-2 text-center text-sm font-semibold text-[#0B2239] shadow hover:brightness-95"
                  >
                    Se connecter
                  </Link>
                </>
              )}

            </div>
          </div>
        )}
      </div>
    </header>
  );
}

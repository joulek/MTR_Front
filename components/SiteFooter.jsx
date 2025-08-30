"use client";

import Link from "next/link";
import { Facebook, Linkedin, ArrowUp, ChevronRight } from "lucide-react";

export default function SiteFooter({ locale = "fr" }) {
  const homeHref = `/${locale}`;

  // Génère un lien d'ancrage vers la home
  const anchor = (id) => `${homeHref}#${id}`;

  const company = [
    { label: "À propos", href: anchor("apropos") },
    { label: "Produits", href: anchor("specialites") },
    { label: "Demande de devis", href: `/${locale}/devis` },
  ];

  const resources = [
    { label: "Help Desk", href: `/${locale}/help-desk` },
    { label: "Catalogue", href: anchor("specialites") },
    { label: "Contact", href: anchor("contact") },
  ];

  return (
    <footer className="relative mt-0 bg-[#0B2239] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_10%,rgba(255,255,255,0.05),transparent),radial-gradient(50%_40%_at_80%_60%,rgba(245,179,1,0.08),transparent)]" />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 md:grid-cols-3">
        {/* Col 1 */}
        <div>
          <h4 className="text-xl font-extrabold">MTR</h4>
          <p className="mt-3 max-w-xs text-sm text-white/80">
            Manufacture Tunisienne des Ressorts.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href="https://www.facebook.com/profile.php?id=100076355199317&locale=fr_FR"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 p-2 hover:bg-white/20"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/manufacutre-tunisienne-des-ressorts-22b388276/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 p-2 hover:bg-white/20"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href="https://wa.me/21698333883"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 p-2 hover:bg-white/20"
              title="WhatsApp : +216 98 333 883"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-500" fill="currentColor">
                <path d="M20.52 3.48A11.9 11.9 0 0012 .07 11.93 11.93 0 001.6 17.93L.07 24l6.2-1.63A11.93 11.93 0 0012 23.84h.01C18.6 23.84 24 18.48 24 11.9c0-3.2-1.25-6.2-3.48-8.42zM12 21.5c-1.9 0-3.73-.5-5.34-1.46l-.38-.23-3.67.97.98-3.58-.25-.37A9.93 9.93 0 1122 11.9c0 5.5-4.48 9.6-10 9.6zm5.14-7.44c-.28-.14-1.64-.8-1.9-.9-.26-.1-.45-.14-.64.14-.19.27-.73.9-.9 1.09-.17.19-.34.21-.62.07-.28-.14-1.17-.43-2.23-1.36-.82-.73-1.37-1.64-1.53-1.91-.16-.27-.02-.42.12-.55.12-.12.28-.32.42-.48.14-.16.19-.27.28-.46.09-.19.05-.35-.02-.48-.07-.14-.64-1.55-.88-2.13-.23-.56-.47-.49-.64-.5h-.55c-.19 0-.5.07-.76.35-.26.27-1 1-1 2.43 0 1.43 1.03 2.82 1.18 3.01.14.19 2.03 3.09 4.93 4.33.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.64-.67 1.87-1.32.23-.65.23-1.21.16-1.32-.07-.12-.26-.19-.54-.33z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Col 2 */}
        <div>
          <h5 className="text-lg font-semibold">Company</h5>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            {company.map((l, i) => (
              <li key={i}>
                <Link
                  href={l.href}
                  className="group inline-flex items-center gap-2 hover:text-[#F5B301]"
                >
                  <ChevronRight className="h-4 w-4 opacity-60 transition group-hover:text-[#F5B301]" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 */}
        <div>
          <h5 className="text-lg font-semibold">Ressources</h5>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            {resources.map((l, i) => (
              <li key={i}>
                <Link
                  href={l.href}
                  className="group inline-flex items-center gap-2 hover:text-[#F5B301]"
                >
                  <ChevronRight className="h-4 w-4 opacity-60 transition group-hover:text-[#F5B301]" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bas de footer */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-sm text-white/80 md:flex-row">
          <p>© {new Date().getFullYear()} MTR. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <Link href={anchor("apropos")} className="hover:text-[#F5B301]">
              À propos
            </Link>
            <Link href={`/${locale}/help-desk`} className="hover:text-[#F5B301]">
              Help Desk
            </Link>
            <Link href={`/${locale}/privacy-policy`} className="hover:text-[#F5B301]">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      {/* Back to top (nécessite id="accueil" sur la page courante) */}
      <a
        href="#accueil"
        className="fixed bottom-6 right-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#F5B301] text-[#0B2239] shadow-xl ring-1 ring-black/10 transition hover:-translate-y-0.5"
        aria-label="Revenir en haut"
      >
        <ArrowUp className="h-5 w-5" />
      </a>
    </footer>
  );
}

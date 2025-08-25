"use client";

import { useEffect, useState } from "react";
import { readConsent, writeConsent, hasAnswered } from "@/utils/consent";

export default function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!hasAnswered()) {
      setOpen(true);
    } else {
      const c = readConsent();
      setAnalytics(!!c?.analytics);
      setMarketing(!!c?.marketing);
    }
  }, []);

  const acceptAll = () => {
    writeConsent({ necessary: true, analytics: true, marketing: true });
    setOpen(false);
    setModal(false);
    dispatchConsentEvent();
  };
  const rejectAll = () => {
    writeConsent({ necessary: true, analytics: false, marketing: false });
    setOpen(false);
    setModal(false);
    dispatchConsentEvent();
  };
  const saveChoices = () => {
    writeConsent({ necessary: true, analytics, marketing });
    setOpen(false);
    setModal(false);
    dispatchConsentEvent();
  };

  return (
    <>
      {/* Banner */}
      {open && !modal && (
        <div className="fixed inset-0 z-[9998] pointer-events-none">
          <div className="absolute inset-0 bg-black/30" />
          <div className="pointer-events-auto fixed left-1/2 top-1/2 z-[9999] w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#0B2239] p-6 text-white shadow-2xl ring-1 ring-white/10">
            <div className="text-center text-lg font-semibold mb-2">Ce site utilise des cookies</div>
            <p className="text-center text-sm/6 opacity-90 mb-5">
              Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez choisir lesquels activer.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* ✅ Accent (jaune) */}
              <button
                onClick={acceptAll}
                className="rounded-full bg-[#F5B301] px-4 py-2 text-sm font-semibold text-[#0B2239] shadow hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                Tout accepter
              </button>
              {/* ◻️ Outline (ton sombre) */}
              <button
                onClick={rejectAll}
                className="rounded-full border border-white/35 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                Tout refuser
              </button>
              {/* ⬜ Bouton clair */}
              <button
                onClick={() => setModal(true)}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0B2239] hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#F5B301]/70"
              >
                Personnaliser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Personnaliser */}
      {open && modal && (
        <div className="fixed inset-0 z-[9998]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-[9999] w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <h3 className="text-xl font-bold text-[#0B2239] mb-4">Préférences de confidentialité</h3>

            <div className="space-y-4">
              <Row
                title="Nécessaires"
                desc="Indispensables au fonctionnement du site."
                checked
                disabled
              />
              <Row
                title="Analytics"
                desc="Mesure d’audience (ex: Google Analytics)."
                checked={analytics}
                onChange={setAnalytics}
              />
              <Row
                title="Marketing"
                desc="Personnalisation publicitaire et suivi multi-sites."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                onClick={rejectAll}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-[#0B2239] hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0B2239]/40"
              >
                Tout refuser
              </button>
              <button
                onClick={acceptAll}
                className="rounded-full bg-[#F5B301] px-4 py-2 text-sm font-semibold text-[#0B2239] shadow hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#F5B301]/60"
              >
                Tout accepter
              </button>
              <button
                onClick={saveChoices}
                className="rounded-full bg-[#0B2239] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#0B2239]/60"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ title, desc, checked=false, disabled=false, onChange }) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border p-4 ${
        disabled ? "bg-slate-50" : "bg-white"
      } border-slate-200`}
    >
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 accent-[#0B2239]"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange?.(e.target.checked)}
      />
      <div>
        <div className="text-sm font-semibold text-[#0B2239]">{title}</div>
        <div className="text-xs text-slate-600">{desc}</div>
      </div>
    </label>
  );
}

function dispatchConsentEvent() {
  try {
    const ev = new Event("mtr:consent:changed");
    window.dispatchEvent(ev);
  } catch {}
}

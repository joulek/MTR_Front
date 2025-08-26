"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import {
  PhoneCall, Mail, MessageSquare, MapPin, Send, ChevronDown,
  CheckCircle, LifeBuoy
} from "lucide-react";

/* ---------------------------- API backend ---------------------------- */
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");

/* ---------- Anim helpers ---------- */
const vSection = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: .5 } },
};
const vStagger = { hidden: {}, show: { transition: { staggerChildren: .06, delayChildren: .05 } } };
const vItem = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: .45 } } };

/* ---------- Label flottant (form) ---------- */
const labelFloat =
  "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-slate-500 " +
  "transition-all duration-150 " +
  "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 " +
  "peer-focus:-top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-[#F5B301] " +
  "peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs";

/* =============================== PAGE =============================== */
export default function HelpDeskPage() {
  const p = useParams();
  const locale = typeof p?.locale === "string" ? p.locale : "fr";

  /* ----- Form ----- */
  const [form, setForm] = useState({ nom: "", email: "", sujet: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const submitContact = async (e) => {
    e.preventDefault();
    setOkMsg(""); setErrMsg(""); setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.message || `Erreur ${res.status}`);
      setOkMsg("✅ Votre message a été envoyé !");
      setForm({ nom: "", email: "", sujet: "", message: "" });
    } catch (err) {
      setErrMsg("❌ " + (err.message || "Impossible d’envoyer le message"));
    } finally {
      setLoading(false);
    }
  };

  /* ----- FAQ simple accordéon ----- */
  const faqs = [
    {
      q: "Comment demander un devis ?",
      a: "Rendez-vous sur la page Devis (bouton dans la barre supérieure ou pied de page). Remplissez vos spécifications (type de ressort, matière, dimensions, quantités). Nous revenons vers vous en 24–48h ouvrées.",
    },
    {
      q: "Quels types de ressorts fabriquez-vous ?",
      a: "Compression, traction, torsion et formes en fil. Travail du fil 0,1–10 mm, petites et grandes séries, avec traitements (zingage, peinture, trempe…).",
    },
    {
      q: "Faites-vous des prototypes ?",
      a: "Oui. Nous proposons l’étude, le co-design et le prototypage rapide avant lancement de série.",
    },
    {
      q: "Quels sont les délais ?",
      a: "Selon la complexité et la quantité : de quelques jours à quelques semaines. Les urgences sont possibles selon charge atelier.",
    },
    {
      q: "Acceptez-vous des petites séries de production ?",
      a: "Oui, nous produisons aussi bien des prototypes, petites séries que des grandes séries industrielles.",
    },
  ];
  const [openIdx, setOpenIdx] = useState(null);
  const toggleFaq = (i) => setOpenIdx((p) => (p === i ? null : i));

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <SiteHeader />

      {/* HERO */}
      <section className="relative -mt-10 flex min-h-[55vh] items-center justify-center bg-[#0B2239] text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_10%,rgba(255,255,255,0.06),transparent),radial-gradient(60%_40%_at_85%_80%,rgba(245,179,1,0.10),transparent)]" />
        <motion.div
          variants={vSection} initial="hidden" animate="show"
          className="mx-auto max-w-4xl px-4 py-24 text-center"
        >
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
            <LifeBuoy className="h-6 w-6 text-[#F5B301]" />
          </div>
          <h1 className="text-4xl font-extrabold md:text-5xl">Centre d’aide MTR</h1>
          <p className="mt-4 text-white/80">
            Besoin d’un devis, d’un conseil technique ou d’un suivi ? On est là pour vous aider.
          </p>
        </motion.div>
      </section>

      {/* CARTES CONTACT RAPIDE */}
      <motion.section
        variants={vSection} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
        className="bg-white py-14"
      >
        <div className="mx-auto max-w-7xl px-4">
          <motion.div variants={vStagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: <PhoneCall className="h-5 w-5 text-[#F5B301]" />,
                  title: "Appel direct",
                  lines: ["+216 00 000 000", "Lun–Ven, 8h–17h"],
                  cta: { label: "Appeler", href: "tel:+21600000000" },
                },
                {
                  icon: <Mail className="h-5 w-5 text-[#F5B301]" />,
                  title: "Écrire un e-mail",
                  lines: ["contact@mtr.tn", "Réponse sous 24h ouvrées"],
                  cta: { label: "Écrire", href: "mailto:contact@mtr.tn" },
                },
                {
                  icon: <MessageSquare className="h-5 w-5 text-[#F5B301]" />,
                  title: "Demander un devis",
                  lines: ["Spécifications, quantités, matière…", "Prototypage possible"],
                  cta: { label: "Aller à la page Devis", href: `/${locale}/devis` },
                },
              ].map((c, i) => (
                <motion.article
                  key={i} variants={vItem}
                  className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
                >
                  <div className="mb-3 inline-flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B2239]/5">{c.icon}</span>
                    <h3 className="text-lg font-bold text-[#0B2239]">{c.title}</h3>
                  </div>
                  <ul className="space-y-1 text-sm text-slate-600">
                    {c.lines.map((l, j) => <li key={j}>{l}</li>)}
                  </ul>
                  <a
                    href={c.cta.href}
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#F5B301] px-4 py-2 text-sm font-semibold text-[#0B2239] hover:bg-[#F5B301]"
                  >
                    {c.cta.label}
                  </a>
                </motion.article>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* FAQ */}
      <motion.section
        variants={vSection} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
        className="relative bg-slate-50 py-16"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_15%_10%,rgba(245,179,1,0.08),transparent),radial-gradient(60%_40%_at_85%_80%,rgba(11,34,57,0.06),transparent)]" />
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-extrabold text-[#0B2239]">Questions fréquentes</h2>
            <p className="mt-2 text-slate-600">Tout ce qu’il faut savoir avant de nous contacter.</p>
          </div>

          <div className="divide-y divide-slate-200 rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
            {faqs.map((item, i) => {
              const open = openIdx === i;
              return (
                <div key={i} className="px-4">
                  <button
                    onClick={() => toggleFaq(i)}
                    className="flex w-full items-center justify-between py-4 text-left"
                  >
                    <span className="text-[#0B2239] font-semibold">{item.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 transition-transform ${open ? "rotate-180 text-[#F5B301]" : "text-slate-400"}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: .25 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-4 text-slate-600">{item.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600">
            <CheckCircle className="h-4 w-4 text-[#F5B301]" />
            <span>Vous ne trouvez pas votre réponse ? Écrivez-nous ci-dessous.</span>
          </div>
        </div>
      </motion.section>

      {/* FORMULAIRE DE CONTACT */}
      <motion.section
        variants={vSection} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
        className="bg-white py-16"
      >
        <div className="mx-auto max-w-5xl px-4">
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold text-[#0B2239]">Nous écrire</h2>
            <p className="mt-2 text-slate-600">
              Décrivez votre besoin : type de ressort, dimensions, quantité, matière, délais…
            </p>
          </div>

          <form
            onSubmit={submitContact}
            className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-slate-200 backdrop-blur"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="relative">
                <input
                  id="nom" name="nom" autoComplete="name"
                  value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="peer w-full rounded-2xl border border-slate-300 bg-transparent px-4 py-4 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2"
                  placeholder=" " required
                />
                <label htmlFor="nom" className={labelFloat}>Nom complet</label>
              </div>
              <div className="relative">
                <input
                  id="email" name="email" type="email" autoComplete="email"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="peer w-full rounded-2xl border border-slate-300 bg-transparent px-4 py-4 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2"
                  placeholder=" " required
                />
                <label htmlFor="email" className={labelFloat}>E-mail</label>
              </div>
              <div className="relative sm:col-span-2">
                <input
                  id="sujet" name="sujet"
                  value={form.sujet} onChange={(e) => setForm({ ...form, sujet: e.target.value })}
                  className="peer w-full rounded-2xl border border-slate-300 bg-transparent px-4 py-4 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2"
                  placeholder=" " required
                />
                <label htmlFor="sujet" className={labelFloat}>Sujet</label>
              </div>
              <div className="relative sm:col-span-2">
                <textarea
                  id="message" name="message" rows={6}
                  value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="peer w-full resize-none rounded-2xl border border-slate-300 bg-transparent px-4 py-4 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2"
                  placeholder=" " required
                />
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
              <button
                type="submit" disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-[#F5B301] px-7 py-3 font-semibold text-[#0B2239] shadow hover:brightness-95 disabled:opacity-60"
              >
                {loading ? "Envoi..." : "Envoyer"} <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </motion.section>

      {/* LOCALISATION (optionnelle) */}
      <motion.section
        variants={vSection} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
        className="relative bg-white pb-16"
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-extrabold text-[#0B2239]">Nous rendre visite</h3>
            <p className="mt-2 text-slate-600">Z.I. Sfax, Tunisie</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200">
            <iframe
              title="Localisation MTR"
              src="https://www.google.com/maps?q=34.8256683,10.7390825&hl=fr&z=18&output=embed"
              className="h-[60vh] w-full"
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
          </div>
        </div>
      </motion.section>
    </div>
  );
}

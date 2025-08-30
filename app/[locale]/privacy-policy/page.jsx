"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter"; // ← import du footer
import {
  ShieldCheck, FileText, Database, Cookie, Lock, Mail, RefreshCw
} from "lucide-react";
import Link from "next/link";

/* ---------- Anim helpers ---------- */
const vSection = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: .5 } },
};
const vStagger = { hidden: {}, show: { transition: { staggerChildren: .08, delayChildren: .04 } } };
const vItem = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: .45 } } };

export default function PrivacyPolicyPage() {
  const p = useParams();
  const locale = typeof p?.locale === "string" ? p.locale : "fr";

  const lastUpdated = "26/08/2025";

  const blocks = [
    {
      icon: <FileText className="h-5 w-5 text-[#F5B301]" />,
      title: "Données que nous collectons",
      content: (
        <>
          <p>
            Nous collectons les informations que vous nous communiquez via nos formulaires (ex. <strong>Nom</strong>, <strong>E-mail</strong>, <strong>Téléphone</strong>, <strong>Sujet</strong>, <strong>Message</strong>, et données utiles au <strong>devis</strong> :
            type de pièce/ressort, dimensions, quantités, matières).
          </p>
          <p className="mt-2">
            Des données de navigation non identifiantes (ex. pages visitées, appareil, navigateur) peuvent aussi être collectées pour améliorer l’expérience.
          </p>
        </>
      ),
    },
    {
      icon: <Database className="h-5 w-5 text-[#F5B301]" />,
      title: "Utilisation des données",
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Répondre à vos demandes de contact et établir des <strong>devis</strong>.</li>
          <li>Assurer le <strong>suivi commercial</strong> et le service après-vente.</li>
          <li>Améliorer notre site et nos services (statistiques anonymisées).</li>
        </ul>
      ),
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-[#F5B301]" />,
      title: "Base légale & conservation",
      content: (
        <>
          <p>
            Le traitement repose selon les cas sur l’<strong>exécution de mesures précontractuelles</strong> (devis), l’<strong>intérêt légitime</strong> (amélioration, sécurité) et/ou votre <strong>consentement</strong>.
          </p>
          <p className="mt-2">
            Les données sont conservées le temps nécessaire aux finalités ci-dessus puis archivées ou supprimées conformément aux obligations légales applicables.
          </p>
        </>
      ),
    },
    {
      icon: <Lock className="h-5 w-5 text-[#F5B301]" />,
      title: "Partage & sécurité",
      content: (
        <>
          <p>
            Nous ne vendons ni ne louons vos données. Elles peuvent être partagées avec des <strong>prestataires</strong> (hébergement, e-mailing, analytics) strictement pour les finalités prévues et sous obligations contractuelles de confidentialité.
          </p>
          <p className="mt-2">
            Nous mettons en œuvre des <strong>mesures techniques et organisationnelles</strong> pour protéger vos informations contre l’accès non autorisé, la perte ou l’altération.
          </p>
        </>
      ),
    },
    {
      icon: <Cookie className="h-5 w-5 text-[#F5B301]" />,
      title: "Cookies",
      content: (
        <>
          <p>
            Des cookies peuvent être utilisés pour assurer le bon fonctionnement du site et mesurer l’audience de façon agrégée. Vous pouvez gérer vos préférences via les paramètres de votre navigateur. 
          </p>
          <p className="mt-2">
            Si une bannière de consentement est présente, votre choix sera respecté et vous pourrez le modifier à tout moment.
          </p>
        </>
      ),
    },
    {
      icon: <RefreshCw className="h-5 w-5 text-[#F5B301]" />,
      title: "Vos droits",
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Accès</strong> à vos données et <strong>copie</strong>.</li>
          <li><strong>Rectification</strong> si elles sont inexactes ou incomplètes.</li>
          <li><strong>Suppression</strong> lorsque cela est applicable.</li>
          <li><strong>Opposition</strong> ou <strong>limitation</strong> à certains traitements.</li>
          <li><strong>Retrait du consentement</strong> à tout moment pour les traitements fondés sur celui-ci.</li>
        </ul>
      ),
    },
    {
      icon: <Mail className="h-5 w-5 text-[#F5B301]" />,
      title: "Contact",
      content: (
        <p>
          Pour toute question ou demande liée à vos données, contactez-nous à{" "}
          <a href="mailto:contact@mtr.tn" className="underline underline-offset-4">contact@mtr.tn</a>. 
          Vous pouvez aussi utiliser notre <Link href={`/${locale}/help-desk`} className="underline underline-offset-4">centre d’aide</Link>.
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <SiteHeader />

      {/* HERO */}
      <section
        id="accueil" // ← pour le bouton “back-to-top” du footer
        className="relative -mt-10 flex min-h-[45vh] items-center justify-center bg-[#0B2239] text-white"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_10%,rgba(255,255,255,0.06),transparent),radial-gradient(60%_40%_at_85%_80%,rgba(245,179,1,0.10),transparent)]" />
        <motion.div
          variants={vSection}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl px-4 py-20 text-center"
        >
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
            <ShieldCheck className="h-6 w-6 text-[#F5B301]" />
          </div>
          <h1 className="text-4xl font-extrabold md:text-5xl">Politique de confidentialité</h1>
          <p className="mt-3 text-white/80">
            Nous protégeons vos données et les utilisons uniquement pour vous servir au mieux.
          </p>
          <p className="mt-2 text-xs text-white/60">Dernière mise à jour : {lastUpdated}</p>
        </motion.div>
      </section>

      {/* CONTENT */}
      <motion.section
        variants={vSection}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="bg-white py-14"
      >
        <div className="mx-auto max-w-5xl px-4">
          <motion.div variants={vStagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <div className="grid gap-6">
              {blocks.map((b, i) => (
                <motion.article
                  key={i}
                  variants={vItem}
                  className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
                >
                  <div className="mb-3 inline-flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B2239]/5">
                      {b.icon}
                    </span>
                    <h2 className="text-lg font-bold text-[#0B2239]">{b.title}</h2>
                  </div>
                  <div className="prose prose-slate max-w-none text-slate-700">
                    {b.content}
                  </div>
                </motion.article>
              ))}
            </div>

            {/* CTA aide */}
            <motion.div
              variants={vItem}
              className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200"
            >
              <p className="text-slate-700">
                Une question sur vos données ? Notre équipe vous répond rapidement.
              </p>
              <div className="flex gap-3">
                <Link
                  href={`/${locale}/help-desk`}
                  className="rounded-full border border-[#F5B301] px-5 py-2 text-sm font-semibold text-[#0B2239] hover:bg-[#F5B301]"
                >
                  Centre d’aide
                </Link>
                <a
                  href="mailto:contact@mtr.tn"
                  className="rounded-full bg-[#F5B301] px-5 py-2 text-sm font-semibold text-[#0B2239] hover:brightness-95"
                >
                  Écrire un e-mail
                </a>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* FOOTER réutilisable */}
      <SiteFooter locale={locale} />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";

/** SVG Ressort animé */
function Ressort({ className = "" }) {
  return (
    <svg
      viewBox="0 0 240 160"
      xmlns="http://www.w3.org/2000/svg"
      className={`mx-auto ${className}`}
      aria-hidden="true"
    >
      <ellipse cx="120" cy="145" rx="65" ry="10" fill="rgba(0,0,0,.08)" />
      <g className="origin-center animate-[bounce_2.2s_ease-in-out_infinite]">
        <rect x="40" y="25" width="160" height="10" rx="5" fill="#0B1E3A" opacity="0.08" />
        <rect x="40" y="120" width="160" height="10" rx="5" fill="#0B1E3A" opacity="0.08" />
        {Array.from({ length: 7 }).map((_, i) => {
          const y = 35 + i * 12.8;
          return (
            <path
              key={i}
              d={`M 50 ${y} C 85 ${y - 8}, 155 ${y + 8}, 190 ${y}`}
              fill="none"
              stroke="#F7C600"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.95"
            />
          );
        })}
      </g>
      <circle cx="200" cy="30" r="8" fill="#F7C600" />
    </svg>
  );
}

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-[100vh] overflow-hidden bg-gradient-to-b from-white via-[#FBFCFE] to-[#F3F6FA] px-6">
      

      {/* Contenu centré */}
      <section className="mx-auto flex max-w-3xl flex-col items-center justify-center py-20 text-center sm:py-28">
        {/* Barre décorative */}

        <Ressort className="w-64 sm:w-72" />

        {/* Badge code */}
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-yellow-300/70 bg-yellow-50 px-3 py-1 text-xs font-semibold text-[#7a5c00] shadow-sm">
          Code 403 · Accès refusé
          <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
        </p>

        {/* Titre */}
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B1E3A]">
          Oups… vous n’avez pas l’autorisation
        </h1>

        {/* Sous-texte */}
        <p className="mt-3 max-w-xl text-sm sm:text-base text-slate-600">
          Votre session ne permet pas d’accéder à cette page.
          Essayez de revenir en arrière ou connectez-vous avec un compte autorisé.
        </p>

        {/* Actions */}
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1E3A] shadow-sm hover:bg-gray-50"
          >
            Revenir en arrière
          </button>

        </div>
      </section>

      {/* Keyframes pour l'animation du ressort */}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </main>
  );
}

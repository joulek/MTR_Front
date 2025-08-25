// components/forms/TorsionForm.jsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import torsionImg from "@/public/devis/torsion.png";

/* --- petite étoile rouge pour champs requis --- */
const RequiredMark = () => <span className="text-red-500" aria-hidden="true"> *</span>;

export default function TorsionForm() {
  const t = useTranslations("auth.torsionForm");

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const [user, setUser] = useState(null);

  const finishedRef = useRef(false);
  const alertRef = useRef(null);

  // Dropzone
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // i18n options (affichage seulement)
  const materialOptions = t.raw("materialOptions") || [];
  const windingOptions = t.raw("windingOptions") || []; // enroulement
  const orientationOptions = t.raw("orientationOptions") || []; // optionnel
  const selectPlaceholder = t.has("selectPlaceholder") ? t("selectPlaceholder") : "Sélectionnez…";

  // --------------------------------------------------------------------
  //  ✅ Ajout minimal : mapping des labels EN -> valeurs FR attendues
  //     (aucun changement d’UI, on convertit juste avant l’envoi)
  const FR_MATIERES = [
    "Fil ressort noir (SM, SH)",
    "Fil ressort galvanisé",
    "Fil ressort inox",
  ];
  const EN_MATIERES = [
    "Black spring wire (SM, SH)",
    "Galvanized spring wire",
    "Stainless steel spring wire",
  ];

  const FR_ENROULEMENTS = ["Enroulement gauche", "Enroulement droite"];
  const EN_ENROULEMENTS = ["Left winding", "Right winding"];

  // Certains projets ont aussi des types d’accrochage sur torsion :
  const FR_ACCROCHAGES = [
    "Anneau Allemand",
    "Double Anneau Allemand",
    "Anneau tangent",
    "Anneau allongé",
    "Boucle Anglaise",
    "Anneau tournant",
    "Conification avec vis",
  ];
  const EN_ACCROCHAGES = [
    "German hook",
    "Double German hook",
    "Tangent hook",
    "Extended hook",
    "English loop",
    "Swivel hook",
    "Conical with screw",
  ];

  // Petits synonymes tolérés
  const EXTRA_SYNONYMS = {
    matiere: {
      "acier inoxydable": "Fil ressort inox",
      inox: "Fil ressort inox",
      galvanized: "Fil ressort galvanisé",
    },
    enroulement: {
      gauche: "Enroulement gauche",
      droite: "Enroulement droite",
      left: "Enroulement gauche",
      right: "Enroulement droite",
    },
  };

  function normalizeField(fd, name, frList, enList, extras = {}) {
    let v = fd.get(name);
    if (!v) return;
    if (frList.includes(v)) return; // déjà FR exact

    // Essai 1: correspondance exacte EN
    const i = enList.indexOf(v);
    if (i >= 0) {
      fd.set(name, frList[i]);
      return;
    }
    // Essai 2: en lower-case
    const low = String(v).toLowerCase().trim();
    const iLow = enList.map(s => s.toLowerCase()).indexOf(low);
    if (iLow >= 0) {
      fd.set(name, frList[iLow]);
      return;
    }
    // Essai 3: synonymes
    if (extras[low]) fd.set(name, extras[low]);
  }
  function normalizeDual(fd, baseName, frList, enList, extras = {}) {
    const a = baseName;
    const b = `spec.${baseName}`;
    if (fd.has(b)) normalizeField(fd, b, frList, enList, extras);
    if (fd.has(a)) normalizeField(fd, a, frList, enList, extras);
  }
  // --------------------------------------------------------------------

  // Récup session
  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data || null))
      .catch(() => setUser(null));
  }, []);

  // scroll vers l’alerte
  useEffect(() => {
    if (alertRef.current && (loading || ok || err)) {
      alertRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, ok, err]);

  // auto-hide succès
  useEffect(() => {
    if (!ok) return;
    const id = setTimeout(() => setOk(""), 5000);
    return () => clearTimeout(id);
  }, [ok]);

  function handleFileList(list) {
    const arr = Array.from(list || []);
    setFiles(arr);
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      arr.forEach(f => dt.items.add(f));
      fileInputRef.current.files = dt.files;
    }
  }
  function onDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) handleFileList(e.dataTransfer.files);
  }

  const onSubmit = async (e) => {
    e.preventDefault();

    const form = e.currentTarget;
    setOk("");
    setErr("");
    finishedRef.current = false;

    if (!user?.authenticated) {
      setErr("Vous devez être connecté pour envoyer un devis.");
      return;
    }
    if (user.role !== "client") {
      setErr("Seuls les clients peuvent envoyer une demande de devis.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData(form);
      fd.append("type", "torsion");  // pour info côté back si besoin

      const userId = localStorage.getItem("id");
      if (userId) fd.append("user", userId);

      // ✅ Normalisation EN -> FR (aucun changement d’UI, seulement la donnée envoyée)
      normalizeDual(fd, "matiere", FR_MATIERES, EN_MATIERES, EXTRA_SYNONYMS.matiere);
      normalizeDual(fd, "enroulement", FR_ENROULEMENTS, EN_ENROULEMENTS, EXTRA_SYNONYMS.enroulement);
      // si ton form inclut aussi typeAccrochage pour torsion :
      normalizeDual(fd, "typeAccrochage", FR_ACCROCHAGES, EN_ACCROCHAGES);

      const res = await fetch("/api/devis/torsion", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      let payload = null;
      try { payload = await res.json(); } catch { }

      if (res.ok) {
        finishedRef.current = true;
        setErr("");
        setOk(t.has("sendSuccess") ? t("sendSuccess") : "Demande envoyée. Merci !");
        form.reset();
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const msg = payload?.message || `Erreur lors de l’envoi. (HTTP ${res.status})`;
      setErr(msg);
    } catch (e) {
      console.error("submit torsion error:", e);
      if (!finishedRef.current) {
        const isAbort = e?.name === "AbortError";
        setErr(isAbort ? "Délai dépassé, réessayez." : "Erreur réseau.");
      }
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !user?.authenticated || user?.role !== "client";

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Titre */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#002147]">
          {t("title")}
        </h2>
      </div>

      <form onSubmit={onSubmit}>
        {/* Schéma */}
        <SectionTitle>{t("schema")}</SectionTitle>
        <div className="mb-6 flex justify-center">
          <Image
            src={torsionImg}
            alt={t.has("schemaAlt") ? t("schemaAlt") : "Torsion schema"}
            width={500}
            height={300}
            className="rounded-xl ring-1 ring-gray-100"
            priority
          />
        </div>

        {/* Dimensions */}
        <SectionTitle>{t("maindim")}</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Input name="d" label={t("diameterWire")} required />
          <Input name="De" label={t("diameterExt")} required />
          <Input name="Lc" label={t("bodyLength")} required />
          <Input name="angle" label={t("angle")} required />
          <Input name="nbSpires" label={t("totalCoils")} required />
          <Input name="L1" label={t("L1")} required />
          <Input name="L2" label={t("L2")} required />
          <Input name="quantite" label={t("quantity")} type="number" min="1" required />
          <SelectBase
            name="matiere"
            label={t("material")}
            options={materialOptions}
            placeholder={selectPlaceholder}
            required
          />
          <SelectBase
            name="enroulement"
            label={t("windingDirection")}
            options={windingOptions}
            placeholder={selectPlaceholder}
            required
          />
          {/* Optionnel : orientation si je l’utilises côté i18n (non requise par le schéma) */}
          {orientationOptions.length > 0 && (
            <SelectBase
              name="orientation"
              label={t("orientation")}
              options={orientationOptions}
              placeholder={selectPlaceholder}
            />
          )}
        </div>

        {/* Fichiers */}
        <SectionTitle className="mt-8">{t("docs")} <RequiredMark /></SectionTitle>
        <p className="text-sm text-gray-500 mb-3">
          {t("acceptedTypes")}
        </p>

        <label
          htmlFor="docs"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center cursor-pointer rounded-2xl text-center transition
                      min-h-[160px] md:min-h-[200px] p-8 bg-white
                      border-2 border-dashed ${isDragging ? "border-yellow-500 ring-2 ring-yellow-300" : "border-yellow-500"}`}
        >
          {files.length === 0 ? (
            <p className="text-base font-medium text-[#002147]">
              {t("dropHere")}
            </p>
          ) : (
            <div className="w-full text-center">
              <p className="text-sm font-semibold text-[#002147] mb-2">
                {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""} :
              </p>
              <p className="mx-auto max-w-[900px] truncate text-[15px] text-[#002147]">
                {files.map((f) => f.name).join(", ")}
              </p>
              <p className="text-xs text-[#002147]/70 mt-1">
                {(files.reduce((s, f) => s + f.size, 0) / 1024).toFixed(0)} Ko au total
              </p>
            </div>
          )}

          <input
            id="docs"
            ref={fileInputRef}
            type="file"
            name="docs"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
            className="hidden"
            onChange={(e) => handleFileList(e.target.files)}
          />
        </label>

        {/* Textes libres */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 mt-6">
          <TextArea name="exigences" label={t("specialReq")} />
          <TextArea name="remarques" label={t("otherRemarks")} />
        </div>

        {/* Submit + alertes */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={disabled}
            className={`w-full rounded-xl font-semibold py-3 transition-all
              ${disabled
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-[#002147] to-[#01346b] text-white shadow-lg hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[0px]"}`}
          >
            {loading
              ? "Envoi en cours…"
              : !user?.authenticated
                ? t("loginToSend")
                : user?.role !== "client"
                  ? t("loginToSend")
                  : t("sendRequest")}
          </button>

          {/* ALERTES SOUS LE BOUTON */}
          <div ref={alertRef} aria-live="polite" className="mt-3">
            {loading ? (
              <Alert
                type="info"
                message="Votre demande de devis est en cours d'envoi, veuillez patienter…"
              />
            ) : err ? (
              <Alert type="error" message={err} />
            ) : ok ? (
              <Alert type="success" message={ok} />
            ) : null}
          </div>
        </div>
      </form>
    </section>
  );
}

/* === UI helpers (mêmes styles que ta version) === */
function SectionTitle({ children, className = "" }) {
  return (
    <div className={`mb-3 mt-4 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="h-5 w-1.5 rounded-full bg-[#002147]" />
        <h3 className="text-lg font-semibold text-[#002147]">{children}</h3>
      </div>
      <div className="mt-2 h-px w-full bg-gradient-to-r from-[#002147]/20 via-gray-200 to-transparent" />
    </div>
  );
}
function Alert({ type = "info", message }) {
  const base = "w-full rounded-xl px-4 py-3 text-sm font-medium border flex items-start gap-2";
  const styles =
    type === "error"
      ? "bg-red-50 text-red-700 border-red-200"
      : type === "success"
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <div className={`${base} ${styles}`}>
      <span className="mt-0.5">•</span>
      <span>{message}</span>
    </div>
  );
}
function Input({ label, name, required, type = "text", min }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block font-medium text-[#002147]">
          {label}{required && <RequiredMark />}
        </label>
      )}
      <input
        name={name}
        type={type}
        min={min}
        required={required}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5
                   text-[#002147] placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147]" />
    </div>
  );
}
function SelectBase({ label, name, options = [], required, placeholder = "Sélectionnez…" }) {
  return (
    <div className="space-y-1 w-full">
      {label && (
        <label className="block font-medium text-[#002147]">
          {label}{required && <RequiredMark />}
        </label>
      )}
      <select
        name={name}
        required={required}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 bg-white
                   text-[#002147] text-[15px] font-medium
                   focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147] pr-10"
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23002147' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.875rem center",
          backgroundSize: "1rem 1rem",
        }}
      >
        <option value="" style={{ color: "#64748b" }}>{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o} style={{ color: "#002147" }}>{o}</option>
        ))}
      </select>
    </div>
  );
}
function TextArea({ label, name }) {
  return (
    <div className="space-y-1">
      <label className="block font-medium text-[#002147]">{label}</label>
      <textarea
        name={name}
        rows={4}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5
                   text-[#002147] placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147]" />
    </div>
  );
}

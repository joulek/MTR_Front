"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

/* ── Options ── */
const TYPE_DOCS = [
  { value: "devis", label: "Devis" },
  { value: "bon_commande", label: "Bon de commande" },
  { value: "bon_livraison", label: "Bon de livraison" },
  { value: "facture", label: "Facture" },
];
const NATURES = [
  { value: "produit_non_conforme", label: "Produit non conforme" },
  { value: "deterioration_transport", label: "Détérioration transport" },
  { value: "erreur_quantite", label: "Erreur de quantité" },
  { value: "retard_livraison", label: "Retard de livraison" },
  { value: "defaut_fonctionnel", label: "Défaut fonctionnel" },
  { value: "autre", label: "Autre" },
];
const ATTENTES = [
  { value: "remplacement", label: "Remplacement" },
  { value: "reparation", label: "Réparation" },
  { value: "remboursement", label: "Remboursement" },
  { value: "autre", label: "Autre" },
];

/* ── Helpers ── */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const formatFR = (d) => (d ? d.toLocaleDateString("fr-FR") : "");

/* ── UI atoms ── */
const RequiredMark = () => <span className="text-red-500" aria-hidden="true"> *</span>;

function SectionTitle({ children, className = "" }) {
  return (
    <div className={`mb-3 mt-6 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="h-4 w-1.5 rounded-full bg-[#002147]" />
        <h3 className="text-base md:text-lg font-semibold text-[#002147]">{children}</h3>
      </div>
      <div className="mt-2 h-px w-full bg-gradient-to-r from-[#002147]/20 via-gray-200 to-transparent" />
    </div>
  );
}

function Alert({ type = "info", message }) {
  const base = "w-full rounded-xl px-3 py-2 text-sm font-medium border flex items-start gap-2";
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

/* Inputs contrôlés */
function Input({
  label,
  name,
  required,
  type = "text",
  min,
  placeholder,
  value,
  onChange,
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[#002147]">
          {label}
          {required && <RequiredMark />}
        </label>
      )}
      <input
        name={name}
        type={type}
        min={min}
        placeholder={placeholder}
        required={required}
        value={value ?? ""}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-200 px-3 py-2
                   text-sm text-[#002147] placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147]"
      />
    </div>
  );
}

function SelectBase({
  label,
  name,
  value,
  onChange,
  options = [],
  required,
  placeholder = "Sélectionnez…",
}) {
  return (
    <div className="space-y-1 w-full">
      {label && (
        <label className="block text-sm font-medium text-[#002147]">
          {label}
          {required && <RequiredMark />}
        </label>
      )}
      <select
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 bg-white
                   text-sm text-[#002147] font-medium
                   focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147] pr-8"
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23002147' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.6rem center",
          backgroundSize: "0.9rem 0.9rem",
        }}
      >
        <option value="" style={{ color: "#64748b" }}>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ color: "#002147" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ── Date picker compact ── */
function PrettyDatePicker({ label, value, onChange, name, required }) {
  const [open, setOpen] = useState(false);
  const selected = fromISO(value);
  const [month, setMonth] = useState(
    () =>
      (selected
        ? new Date(selected.getFullYear(), selected.getMonth(), 1)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const daysShort = ["lu", "ma", "me", "je", "ve", "sa", "di"];
  const monthLabel = month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const start = (() => {
    const d = new Date(month);
    const wd = (d.getDay() + 6) % 7; // lundi=0
    d.setDate(d.getDate() - wd);
    return d;
  })();
  const grid = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const isSameDay = (a, b) =>
    a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div className="space-y-1" ref={wrapRef}>
      {label && (
        <label className="block text-sm font-medium text-[#002147]">
          {label}
          {required && <RequiredMark />}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full text-left rounded-xl border border-gray-200 px-3 py-2 bg-white
                   text-sm text-[#002147] placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147] relative"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`${value ? "text-[#002147]" : "text-gray-400"}`}>
          {value ? formatFR(fromISO(value)) : "jj/mm/aaaa"}
        </span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#002147]/70">📅</span>
      </button>
      <input type="hidden" name={name} value={value || ""} />

      {open && (
        <div className="absolute z-50 mt-2 w-[240px] rounded-lg border border-gray-200 bg-white shadow-xl p-2">
          <div className="flex items-center justify-between px-1 pb-1">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="rounded-md px-1.5 py-0.5 text-sm hover:bg-gray-100"
              aria-label="Mois précédent"
            >‹</button>
            <div className="font-semibold text-sm text-[#002147] capitalize">{monthLabel}</div>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="rounded-md px-1.5 py-0.5 text-sm hover:bg-gray-100"
              aria-label="Mois suivant"
            >›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500 mb-1">
            {daysShort.map((d) => <div key={d} className="py-0.5">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === month.getMonth();
              const isToday = isSameDay(d, new Date());
              const isSelected = selected && isSameDay(d, selected);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { onChange(toISO(d)); setOpen(false); }}
                  className={`py-1 rounded-md text-xs
                    ${inMonth ? "text-[#002147]" : "text-gray-400"}
                    ${isSelected ? "bg-[#002147] text-white" : "hover:bg-gray-100"}
                    ${isToday && !isSelected ? "ring-1 ring-[#002147]/40" : ""}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                onChange(toISO(t));
                setMonth(new Date(t.getFullYear(), t.getMonth(), 1));
                setOpen(false);
              }}
              className="text-xs text-[#002147] font-medium hover:underline"
            >
              Aujourd’hui
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ── */
export default function ReclamationClient() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/session", { cache: "no-store", credentials: "include" });
        const data = res.ok ? await res.json() : null;
        setSession(data || null);
      } catch {
        setSession(null);
      } finally {
        setLoadingSession(false);
      }
    })();
  }, []);
  const isAuthenticated = !!session?.authenticated;
  const isClient = session?.role === "client";

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const alertRef = useRef(null);

  const [form, setForm] = useState({
    typeDoc: "devis",
    numero: "",
    dateLivraison: "",
    referenceProduit: "",
    quantite: "",
    nature: "produit_non_conforme",
    natureAutre: "",
    attente: "remplacement",
    attenteAutre: "",
  });
  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const onChange = (e) => {
    const { name, value } = e.target;
    setField(name, value);
  };

  /* Efface l’avertissement si un numéro est saisi */
  useEffect(() => {
    if (message.startsWith("⚠️") && form.numero.trim()) setMessage("");
  }, [form.numero, message]);

  // Dropzone
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  function handleFileList(list) {
    const arr = Array.from(list || []);
    setFiles(arr);
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      arr.forEach((f) => dt.items.add(f));
      fileInputRef.current.files = dt.files;
    }
  }
  function onDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) handleFileList(e.dataTransfer.files);
  }

  useEffect(() => {
    if (alertRef.current && message) {
      alertRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!isAuthenticated) {
      const next = encodeURIComponent(pathname || `/${locale}/client/reclamations`);
      router.push(`/${locale}/login?next=${next}`);
      return;
    }
    if (!isClient) { setMessage("❌ Cette action est réservée aux clients."); return; }
    if (!form.numero.trim()) { setMessage("⚠️ Le numéro de document est obligatoire."); return; }
    if (form.nature === "autre" && !form.natureAutre.trim()) { setMessage("⚠️ Précisez la nature de la réclamation."); return; }
    if (form.attente === "autre" && !form.attenteAutre.trim()) { setMessage("⚠️ Précisez votre attente."); return; }

    setSubmitting(true);
    try {
      const piecesJointes = await Promise.all(
        (files || []).map(async (file) => ({
          filename: file.name,
          mimetype: file.type || "application/octet-stream",
          data: await fileToBase64(file),
        }))
      );

      const parts = [];
      if (form.nature === "autre") parts.push(`Nature: ${form.natureAutre.trim()}`);
      if (form.attente === "autre") parts.push(`Attente: ${form.attenteAutre.trim()}`);
      const description = parts.length ? parts.join(" | ") : undefined;

      const localId = typeof window !== "undefined" ? localStorage.getItem("id") : null;

      const payload = {
        user: localId || null,
        commande: {
          typeDoc: form.typeDoc,
          numero: form.numero.trim(),
          dateLivraison: form.dateLivraison ? new Date(form.dateLivraison) : undefined,
          referenceProduit: form.referenceProduit || undefined,
          quantite: form.quantite ? Number(form.quantite) : undefined,
        },
        nature: form.nature,
        attente: form.attente,
        description,
        piecesJointes,
      };

      const res = await fetch(`${BACKEND}/api/reclamations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!json?.success) throw new Error(json?.message || `HTTP ${res.status}`);

      setMessage("✅ Réclamation envoyée avec succès.");
      setForm({
        typeDoc: "devis",
        numero: "",
        dateLivraison: "",
        referenceProduit: "",
        quantite: "",
        nature: "produit_non_conforme",
        natureAutre: "",
        attente: "remplacement",
        attenteAutre: "",
      });
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setMessage(`❌ ${err?.message || "Erreur inconnue"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = loadingSession || submitting || !isAuthenticated || !isClient;

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Titre */}
      <div className="text-center mb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#002147]">
          Passer une réclamation
        </h1>
        <p className="mt-1.5 text-sm text-gray-600">
          Merci de préciser votre document et le motif. Vous pouvez joindre des photos ou un PDF.
        </p>
      </div>

      {/* Carte blanche derrière les champs */}
      <div className="rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,.06)] border border-gray-100 p-4 md:p-6">
        {/* ⬇️ ALERTES ENLEVÉES (non connecté / non client) */}

        <form onSubmit={handleSubmit} className="mt-0">
          <SectionTitle>Informations document</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <SelectBase
              name="typeDoc"
              value={form.typeDoc}
              onChange={onChange}
              label="Type de document"
              required
              options={TYPE_DOCS}
            />
            <Input
              name="numero"
              label="N° document"
              required
              placeholder="ex: DV2500016"
              value={form.numero}
              onChange={onChange}
            />

            <PrettyDatePicker
              label="Date de livraison"
              name="dateLivraison"
              value={form.dateLivraison}
              onChange={(val) => setField("dateLivraison", val)}
            />

            <Input
              name="referenceProduit"
              label="Référence produit"
              placeholder="ex: ART-001"
              value={form.referenceProduit}
              onChange={onChange}
            />
            <Input
              type="number"
              min="0"
              name="quantite"
              label="Quantité"
              placeholder="ex: 10"
              value={form.quantite}
              onChange={onChange}
            />
          </div>

          <SectionTitle>Réclamation</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <SelectBase
              name="nature"
              value={form.nature}
              onChange={onChange}
              label="Nature de la réclamation"
              required
              options={NATURES}
            />
            {form.nature === "autre" && (
              <Input
                name="natureAutre"
                label="Précisez la nature"
                required
                value={form.natureAutre}
                onChange={onChange}
              />
            )}

            <SelectBase
              name="attente"
              value={form.attente}
              onChange={onChange}
              label="Votre attente"
              required
              options={ATTENTES}
            />
            {form.attente === "autre" && (
              <Input
                name="attenteAutre"
                label="Précisez votre attente"
                required
                value={form.attenteAutre}
                onChange={onChange}
              />
            )}
          </div>

          <SectionTitle>Pièces jointes</SectionTitle>
          <p className="text-xs text-gray-500 mb-2">Formats : images ou PDF.</p>

          {/* Dropzone compacte */}
          <label
            htmlFor="files"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => onDrop(e)}
            className={`flex flex-col items-center justify-center cursor-pointer rounded-2xl text-center transition
                        min-h-[110px] md:min-h-[130px] p-5 bg-white
                        border-2 border-dashed ${isDragging ? "border-yellow-500 ring-2 ring-yellow-300" : "border-yellow-500"}`}
          >
            {files.length === 0 ? (
              <p className="text-sm font-medium text-[#002147]">
                Déposez vos fichiers ici ou cliquez pour sélectionner
              </p>
            ) : (
              <div className="w-full text-center">
                <p className="text-sm font-semibold text-[#002147] mb-1">
                  {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""} :
                </p>
                <p className="mx-auto max-w-[900px] truncate text-[13px] text-[#002147]">
                  {files.map((f) => f.name).join(", ")}
                </p>
                <p className="text-[11px] text-[#002147]/70 mt-1">
                  {(files.reduce((s, f) => s + f.size, 0) / 1024).toFixed(0)} Ko au total
                </p>
              </div>
            )}
            <input
              id="files"
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFileList(e.target.files)}
            />
          </label>

          {/* Zone messages (succès/erreur/validation) */}
          <div ref={alertRef} aria-live="polite" className="mt-4">
            {message && (
              <Alert
                type={message.startsWith("✅") ? "success" : message.startsWith("⚠️") ? "info" : "error"}
                message={message}
              />
            )}
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={disabled}
              className={`w-full rounded-xl font-semibold py-3 transition-all
                ${disabled
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#002147] to-[#01346b] text-white shadow-lg hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[0px]"}`}
              title={!isAuthenticated ? "Connectez-vous pour envoyer" : !isClient ? "Réservé aux clients" : ""}
            >
              {submitting
                ? "Envoi en cours…"
                : !isAuthenticated
                ? "Se connecter pour envoyer"
                : !isClient
                ? "Accès réservé client"
                : "Envoyer la réclamation"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

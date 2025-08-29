"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Pagination from "@/components/Pagination";
import { FiSearch, FiXCircle } from "react-icons/fi";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// Helpers
function humanSize(bytes = 0) {
  if (!bytes) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0,
    n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}
function shortMime(m) {
  if (!m) return "?";
  if (m.includes("pdf")) return "pdf";
  if (m.includes("word")) return "docx";
  if (m.includes("excel")) return "xlsx";
  if (m.includes("image")) return "image";
  if (m.includes("text")) return "txt";
  return m.split("/").pop();
}
function cleanFilename(name = "") { return name.startsWith("~$") ? "" : name; }
function shortDate(d) {
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch { return ""; }
}

// Conteneur
const WRAP = "mx-auto w-full max-w-4xl px-3 sm:px-4";

export default function AdminDevisTractionPage() {
  const t = useTranslations("devisTraction");

  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 👇 Modale + map des devis existants
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState(null);
  // { [demandeId]: { numero, pdf } }
  const [devisMap, setDevisMap] = useState({});

  const router = useRouter();

  const load = useCallback(async () => {
    try {
      setErr(""); setLoading(true);
      const res = await fetch(`${BACKEND}/api/admin/devis/traction`, {
        cache: "no-store",
        credentials: "include",
      });
      if (res.status === 401) {
        router.push(`/fr/login?next=${encodeURIComponent("/fr/admin/devis/traction")}`);
        return;
      }
      if (res.status === 403) {
        router.push(`/fr/unauthorized?code=403`);
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || `Erreur (${res.status})`);
      setItems(data.items || []);
      setPage(1);
    } catch (e) {
      setErr(e.message || t("errors.network"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => { load(); }, [load]);

  // 🔎 Vérifier s’il existe un devis pour chaque demande
  useEffect(() => {
    if (!items.length) { setDevisMap({}); return; }
    let cancelled = false;

    (async () => {
      const pairs = await Promise.all(
        items.map(async (d) => {
          try {
            const r = await fetch(
              `${BACKEND}/api/devis/admin/by-demande/${d._id}?numero=${encodeURIComponent(d?.numero || "")}`,
              { credentials: "include" }
            );
            const j = await r.json().catch(() => null);
            // backend: { success:true, exists:true, devis:{numero}, pdf } ou { success:false, exists:false }
            if (j?.success && j?.exists) return [d._id, { numero: j.devis?.numero, pdf: j.pdf }];
            return null;
          } catch { return null; }
        })
      );
      if (cancelled) return;
      const map = {};
      for (const p of pairs) if (p) map[p[0]] = p[1];
      setDevisMap(map);
    })();

    return () => { cancelled = true; };
  }, [items]);

  // Filtre local (N°, Client, Date)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((d) => {
      const numero = String(d?.numero || "").toLowerCase();
      const client = `${d?.user?.prenom || ""} ${d?.user?.nom || ""}`.trim().toLowerCase();
      let dateStr = "";
      try { dateStr = new Date(d?.createdAt).toLocaleDateString().toLowerCase(); } catch {}
      return numero.includes(needle) || client.includes(needle) || dateStr.includes(needle);
    });
  }, [items, q]);

  const total = filtered.length;
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [total, page, pageSize]);

  useEffect(() => { setPage(1); }, [q]);

  async function viewPdfById(id) {
    try {
      const res = await fetch(`${BACKEND}/api/admin/devis/traction/${id}/pdf`, { credentials: "include" });
      if (!res.ok) return alert(t("errors.pdfUnavailable"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { alert(t("errors.pdfOpenError")); }
  }
  async function viewDocByIndex(id, index) {
    try {
      const res = await fetch(`${BACKEND}/api/admin/devis/traction/${id}/document/${index}`, { credentials: "include" });
      if (!res.ok) return alert(t("errors.docUnavailable"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { alert(t("errors.docOpenError")); }
  }

  // ➕ Ouvrir la modale création de devis
  function openDevis(d) {
    setSelectedDemande({ ...d, demandeNumero: d?.numero || "" });
    setModalOpen(true);
  }

  // Colonnes (inclut “Actions”)
  const colWidths = ["w-[150px]", "w-[200px]", "w-[160px]", "w-[90px]", "w-[130px]", "w-auto"];

  return (
    <div className="py-6 space-y-4">
      {/* Titre + Recherche */}
      <div className={WRAP}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0B1E3A]">
            {t("title")}
          </h1>

          {/* Barre de recherche */}
          <div className="relative w-full sm:w-[300px]">
            <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchAria")}
              className="w-full rounded-lg border border-gray-300 bg-white px-8 pr-8 py-1.5 text-sm text-[#0B1E3A]
                         shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label={t("clearSearch")}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center
                           h-5 w-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <FiXCircle size={14} />
              </button>
            )}
          </div>
        </div>

        {err && (
          <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700">
            {err}
          </p>
        )}
      </div>

      {/* TABLE */}
      <div className={WRAP}>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-6 bg-gray-100 rounded" />
            <div className="h-6 bg-gray-100 rounded" />
            <div className="h-6 bg-gray-100 rounded" />
          </div>
        ) : total === 0 ? (
          <p className="text-gray-500">{t("noData")}</p>
        ) : (
          <>
            {/* Desktop / tablette */}
            <div className="hidden sm:block">
              <table className="w-full table-fixed text-sm border-separate border-spacing-0">
                <colgroup>
                  {colWidths.map((w, i) => <col key={i} className={w} />)}
                </colgroup>

                <thead>
                  <tr>
                    {[t("columns.number"), t("columns.client"), t("columns.date"), t("columns.pdf"), "Actions", t("columns.attachments")].map((h) => (
                      <th key={h} className="p-2 text-left align-bottom">
                        <div className="text-[13px] font-semibold uppercase tracking-wide text-slate-600">
                          {h}
                        </div>
                        <div className="mt-2 h-px w-full bg-gray-200" />
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="text-[#0B1E3A]">
                  {pageItems.map((d) => {
                    const hasPdf = !!d?.hasDemandePdf;
                    const docs = (d?.documents || [])
                      .map((doc, idx) => ({ ...doc, index: doc.index ?? idx, filename: cleanFilename(doc.filename) }))
                      .filter((doc) => doc.filename && (doc.size ?? 0) > 0);

                    const devisInfo = devisMap[d._id]; // { numero, pdf } si existe

                    return (
                      <tr key={d._id} className="hover:bg-[#0B1E3A]/[0.03] transition-colors">
                        {/* N° */}
                        <td className="p-2 align-top border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#F7C600]" />
                            <span className="font-mono whitespace-nowrap">{d.numero}</span>
                          </div>
                        </td>

                        {/* Client */}
                        <td className="p-2 align-top border-b border-gray-200">
                          <span className="block truncate" title={`${d.user?.prenom || ""} ${d.user?.nom || ""}`}>
                            {d.user?.prenom} {d.user?.nom}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="p-2 align-top border-b border-gray-200">
                          {shortDate(d.createdAt)}
                        </td>

                        {/* PDF (demande) */}
                        <td className="p-2 align-top border-b border-gray-200">
                          {hasPdf ? (
                            <button
                              onClick={() => viewPdfById(d._id)}
                              className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px] hover:bg-[#0B1E3A]/5"
                            >
                              {t("open")}
                            </button>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>

                        {/* Actions (Créer/Ouvrir devis) */}
                        <td className="p-2 align-top border-b border-gray-200">
                          {devisInfo?.pdf ? (
                            <a
                              href={devisInfo.pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Devis ${devisInfo.numero || ""}`}
                              className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px] hover:bg-[#0B1E3A]/5"
                            >
                              Ouvrir devis
                            </a>
                          ) : (
                            <button
                              onClick={() => openDevis(d)}
                              className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px] hover:bg-yellow-500 hover:text-white"
                            >
                               Créer devis
                            </button>
                          )}
                        </td>

                        {/* Fichiers joints */}
                        <td className="p-2 align-top border-b border-gray-200">
                          {docs.length === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {docs.map((doc) => (
                                <button
                                  key={doc.index}
                                  onClick={() => viewDocByIndex(d._id, doc.index)}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px] hover:bg-[#0B1E3A]/5"
                                  aria-label={t("attachmentsOpenAria", { index: (doc.index ?? 0) + 1 })}
                                >
                                  {t("open")}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination desktop/tablette */}
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-gray-200">
              {pageItems.map((d) => {
                const hasPdf = !!d?.hasDemandePdf;
                const docs = (d?.documents || [])
                  .map((doc, idx) => ({ ...doc, index: doc.index ?? idx, filename: cleanFilename(doc.filename) }))
                  .filter((doc) => doc.filename && (doc.size ?? 0) > 0);
                const devisInfo = devisMap[d._id];

                return (
                  <div key={d._id} className="py-3">
                    <div className="flex items-center gap-2 text-[#0B1E3A]">
                      <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                      <span className="font-mono">{d.numero}</span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-gray-500">{t("columns.client")}</p>
                        <p className="truncate">{d.user?.prenom} {d.user?.nom}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500">{t("columns.date")}</p>
                        <p className="truncate">{shortDate(d.createdAt)}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex gap-2 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-gray-500">{t("columns.pdf")}</span>{" "}
                        {hasPdf ? (
                          <button
                            onClick={() => viewPdfById(d._id)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[12px] text-[#0B1E3A] hover:bg-[#0B1E3A]/5"
                          >
                            {t("open")}
                          </button>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-gray-500">Devis</span>{" "}
                        {devisInfo?.pdf ? (
                          <a
                            href={devisInfo.pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[12px] text-[#0B1E3A] hover:bg-[#0B1E3A]/5"
                          >
                            Ouvrir
                          </a>
                        ) : (
                          <button
                            onClick={() => openDevis(d)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[12px] text-[#0B1E3A] hover:bg-yellow-500 hover:text-white"
                          >
                            Créer
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-xs font-semibold text-gray-500">{t("columns.attachments")}</p>
                    {docs.length === 0 ? (
                      <p className="text-gray-500">—</p>
                    ) : (
                      <ul className="mt-1 space-y-2">
                        {docs.map((doc) => (
                          <li key={doc.index} className="text-sm">
                            <div className="text-slate-700 break-all">{doc.filename}</div>
                            <div className="text-[11px] text-gray-500">
                              {shortMime(doc.mimetype)} · {humanSize(doc.size)}
                            </div>
                            <button
                              onClick={() => viewDocByIndex(d._id, doc.index)}
                              className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px] hover:bg-[#0B1E3A]/5"
                            >
                              {t("open")}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}

              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          </>
        )}
      </div>

      {/* Modale création de devis */}
   
   
    </div>
  );
}

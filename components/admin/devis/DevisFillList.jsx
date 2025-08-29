"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Pagination from "@/components/Pagination";
import { FiSearch, FiXCircle } from "react-icons/fi";
import MultiDevisModal from "@/components/admin/devis/MultiDevisModal";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const WRAP = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

/* Helpers */
function cleanFilename(name = "") {
  return name?.startsWith?.("~$") ? "" : name || "";
}
function shortDate(d) {
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "";
  }
}

export default function DevisFilList() {
  const t = useTranslations("devisFil");
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // Recherche
  const [q, setQ] = useState("");

  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState([]);
  const [multiOpen, setMultiOpen] = useState(false);
  const [multiDemands, setMultiDemands] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Devis existants (si besoin dans le futur)
  const [devisMap, setDevisMap] = useState({}); // {demandeId: {numero, pdf}}

  // --- Toast (message non bloquant) ---
  const [toast, setToast] = useState(null); // { text, kind: 'info' | 'warning' | 'success' | 'error' }
  const toastTimer = useRef(null);
  const showToast = useCallback((text, kind = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, kind });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  // Charger la liste
  const load = useCallback(async () => {
    try {
      setErr("");
      setLoading(true);
      const res = await fetch(`${BACKEND}/api/admin/devis/fil`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (res.status === 401) {
        router.push(`/fr/login?next=${encodeURIComponent("/fr/admin/devis/fil")}`);
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
      setErr(e.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Vérifier devis existants (optionnel)
  useEffect(() => {
    if (!items.length) {
      setDevisMap({});
      return;
    }
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
            if (j?.success && j?.exists) return [d._id, { numero: j.devis?.numero, pdf: j.pdf }];
            return null;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      const map = {};
      for (const p of pairs) if (p) map[p[0]] = p[1];
      setDevisMap(map);
    })();
    return () => { cancelled = true; };
  }, [items]);

  // Filtrage
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

  // Clamp + reset page
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [filtered.length, page, pageSize]);
  useEffect(() => { setPage(1); }, [q]);

  // Pagination
  const { pageItems, total } = useMemo(() => {
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return { pageItems: filtered.slice(start, end), total };
  }, [filtered, page, pageSize]);

  // Ouverture PDF (⚠️ manquait dans ton fichier)
  async function viewPdfById(id) {
    try {
      const res = await fetch(`${BACKEND}/api/admin/devis/fil/${id}/pdf`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        showToast(t("errors.pdfUnavailable"), "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      showToast(t("errors.pdfOpenError"), "error");
    }
  }

  // Ouverture doc
  async function viewDocByIndex(id, index) {
    try {
      const res = await fetch(`${BACKEND}/api/admin/devis/fil/${id}/document/${index}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        showToast(t("errors.docUnavailable"), "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      showToast(t("errors.docOpenError"), "error");
    }
  }

  // Ouvrir la modale multi-devis à partir de la sélection
  function openMultiFromSelection() {
    const chosen = items.filter((it) => selectedIds.includes(it._id));
    if (!chosen.length) return;
    const c0 = chosen[0]?.user?._id?.toString?.();
    if (!chosen.every((x) => (x?.user?._id?.toString?.()) === c0)) {
      showToast("Sélectionne des demandes appartenant au même client.", "warning");
      return;
    }
    setMultiDemands(chosen);
    setMultiOpen(true);
  }

  // ---- UI ----
  return (
    <div className="py-6 space-y-6">
      {/* Toolbar */}
      <div className={WRAP}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-1xl lg:text-2xl font-extrabold tracking-tight text-[#0B1E3A]">
            {t("title")}
          </h1>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[320px] lg:w-[420px]">
              <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchAria")}
                className="w-full rounded-xl border border-gray-300 bg-white px-10 pr-9 py-2 text-sm text-[#0B1E3A]
                           shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label={t("clearSearch")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <FiXCircle size={16} />
                </button>
              )}
            </div>

            <button
              disabled={selectedIds.length === 0}
              onClick={openMultiFromSelection}
              className="inline-flex items-center justify-center rounded-xl bg-[#F7C600] text-[#0B1E3A] px-4 py-2 font-semibold shadow disabled:opacity-50"
            >
              Créer devis (sélection)
            </button>
          </div>
        </div>

        {err && (
          <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700">{err}</p>
        )}
      </div>

      {/* Table */}
      <div className={WRAP}>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ) : total === 0 ? (
          <p className="text-gray-500">{t("noData")}</p>
        ) : (
          <>
            {/* Desktop / tablette */}
            <div className="hidden sm:block rounded-2xl border border-[#F7C60022] bg-white shadow">
              {/* pas de scroll horizontal */}
              <div className="overflow-x-hidden">
                <table className="w-full table-auto text-[13px] md:text-sm border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr>
                      <th className="p-2.5 text-left align-bottom w-12">
                        <input
                          type="checkbox"
                          aria-label="Tout sélectionner sur la page"
                          checked={pageItems.length > 0 && pageItems.every((it) => selectedIds.includes(it._id))}
                          onChange={(e) => {
                            const pageIds = pageItems.map((it) => it._id);
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? Array.from(new Set([...prev, ...pageIds]))
                                : prev.filter((id) => !pageIds.includes(id))
                            );
                          }}
                        />
                        <div className="mt-2 h-px w-full bg-gray-200" />
                      </th>

                      {[t("columns.number"), t("columns.client"), t("columns.date"), t("columns.pdf"), t("columns.attachments")].map((h) => (
                        <th key={h} className="p-2.5 text-left align-bottom">
                          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">{h}</div>
                          <div className="mt-2 h-px w-full bg-gray-200" />
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="text-[#0B1E3A]">
                    {pageItems.map((d) => {
                      const hasPdf = !!d?.hasDemandePdf;
                      const docs = (d?.documents || [])
                        .map((doc, i) => ({ ...doc, index: doc.index ?? i, filename: cleanFilename(doc.filename) }))
                        .filter((doc) => doc.filename && (doc.size ?? 0) > 0);

                      return (
                        <tr key={d._id} className="odd:bg-slate-50/40 hover:bg-[#0B1E3A]/[0.04] transition-colors">
                          {/* checkbox */}
                          <td className="p-2.5 align-top border-b border-gray-200 w-12">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(d._id)}
                              onChange={(e) =>
                                setSelectedIds((prev) =>
                                  e.target.checked ? [...prev, d._id] : prev.filter((id) => id !== d._id)
                                )
                              }
                            />
                          </td>

                          {/* N° */}
                          <td className="p-2.5 align-top border-b border-gray-200 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600] shrink-0" />
                              <span className="font-mono">{d.numero}</span>
                            </div>
                          </td>

                          {/* Client */}
                          <td className="p-2.5 align-top border-b border-gray-200">
                            <span
                              className="block truncate max-w-[14rem] lg:max-w-[18rem]"
                              title={`${d.user?.prenom || ""} ${d.user?.nom || ""}`}
                            >
                              {d.user?.prenom} {d.user?.nom}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="p-2.5 align-top border-b border-gray-200 whitespace-nowrap">
                            {shortDate(d.createdAt)}
                          </td>

                          {/* PDF demande */}
                          <td className="p-2.5 align-top border-b border-gray-200 whitespace-nowrap">
                            {hasPdf ? (
                              <button
                                onClick={() => viewPdfById(d._id)}
                                className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-3 py-1 text-[12px] hover:bg-[#0B1E3A]/5"
                              >
                                {t("open")}
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          {/* Fichiers joints */}
                          <td className="p-2.5 align-top border-b border-gray-200">
                            <div className="flex flex-wrap gap-2">
                              {docs.length === 0 ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                docs.map((doc) => (
                                  <button
                                    key={doc.index}
                                    onClick={() => viewDocByIndex(d._id, doc.index)}
                                    className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-3 py-1 text-[12px] hover:bg-[#0B1E3A]/5"
                                  >
                                    {t("open")}
                                  </button>
                                ))
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-3 py-3">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            </div>

            {/* Mobile (cartes) */}
            <div className="sm:hidden divide-y divide-gray-200">
              <div className="flex justify-end pb-2">
                <button
                  disabled={selectedIds.length === 0}
                  onClick={openMultiFromSelection}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#F7C600] text-[#0B1E3A] px-4 py-2 font-semibold shadow disabled:opacity-50"
                >
                  Créer devis (sélection)
                </button>
              </div>

              {pageItems.map((d) => {
                const hasPdf = !!d?.hasDemandePdf;
                const docs = (d?.documents || [])
                  .map((doc, idx) => ({ ...doc, index: doc.index ?? idx, filename: cleanFilename(doc.filename) }))
                  .filter((doc) => doc.filename && (doc.size ?? 0) > 0);

                return (
                  <div key={d._id} className="py-3">
                    <div className="flex items-center gap-2 text-[#0B1E3A]">
                      <input
                        type="checkbox"
                        className="mr-1"
                        checked={selectedIds.includes(d._id)}
                        onChange={(e) =>
                          setSelectedIds((prev) => (e.target.checked ? [...prev, d._id] : prev.filter((id) => id !== d._id)))
                        }
                      />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600]" />
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

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-gray-500">{t("columns.pdf")}</span>{" "}
                        {hasPdf ? (
                          <button
                            onClick={() => viewPdfById(d._id)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[12px] text-[#0B1E3A] hover:bg-[#0B1E3A]/5"
                          >
                            {t("open")}
                          </button>
                        ) : <span className="text-gray-500">—</span>}
                      </div>

                    </div>

                    <p className="mt-2 text-xs font-semibold text-gray-500">{t("columns.attachments")}</p>
                    {docs.length === 0 ? (
                      <p className="text-gray-500">—</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {docs.map((doc) => (
                          <button
                            key={doc.index}
                            onClick={() => viewDocByIndex(d._id, doc.index)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[12px] text-[#0B1E3A] hover:bg-[#0B1E3A]/5"
                          >
                            {t("open")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          </>
        )}
      </div>

      {/* ✅ Modale multi-devis (correcte) */}
      <MultiDevisModal
        open={multiOpen}
        onClose={() => setMultiOpen(false)}
        demands={multiDemands}
        onCreated={() => {
          setMultiOpen(false);
          setSelectedIds([]);
          load();
        }}
        demandKinds={["fil"]}
        articleKinds={["fil", "fil_dresse_coupe"]}
      />

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={[
            "fixed z-50 top-4 right-4 sm:right-6 rounded-xl border px-4 py-2 shadow-lg",
            toast.kind === "success" && "bg-emerald-50 border-emerald-200 text-emerald-900",
            toast.kind === "warning" && "bg-amber-50 border-amber-200 text-amber-900",
            toast.kind === "error"   && "bg-red-50 border-red-200 text-red-800",
            (!toast.kind || toast.kind === "info") && "bg-blue-50 border-blue-200 text-blue-800",
          ].filter(Boolean).join(" ")}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm">{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-1 inline-flex items-center justify-center rounded-md border border-black/10 bg-white/70 px-2 py-0.5 text-xs text-slate-700 hover:bg-white"
              aria-label="Fermer le message"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiSearch, FiXCircle, FiFileText } from "react-icons/fi";
import Pagination from "@/components/Pagination";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

/* Helpers */
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
const uniq = (arr) => Array.from(new Set(arr || []));

// normalisation des valeurs provenant de l'API
const normalizeType = (x) => {
  const s = String(x || "").trim().toLowerCase();
  if (!s) return "";
  if (
    [
      "fil",
      "fil-dresse",
      "fil dresse",
      "fil_dresse",
      "fildresse",
      "fil dressé coupé",
      "fil dresse coupe",
    ].includes(s)
  ) {
    return "filDresse";
  }
  return s; // compression, torsion, traction, grille, autre…
};

// libellés jolis
const displayType = (t) =>
  ({
    compression: "Compression",
    torsion: "Torsion",
    traction: "Traction",
    filDresse: "Fil dressé coupé",
    grille: "Grille métallique",
    autre: "Autre article",
  }[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : ""));

/* Mapping UI → segments API connus */
const API_TYPE_MAP = {
  compression: "compression",
  torsion: "torsion",
  traction: "traction",
  filDresse: "fil", // <- important
  grille: "grille",
  autre: "autre",
};

export default function DevisList() {
  const router = useRouter();

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(true);

  const [demandes, setDemandes] = useState([]);
  const [rows, setRows] = useState([]);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Par défaut: tous les types
  const [typeFilter, setTypeFilter] = useState("all");

  // ---- helpers fetch ----
  const opts = { method: "GET", cache: "no-store", credentials: "include" };

  async function fetchOneType(seg) {
    // essaie /:type puis ?type=
    const try1 = `${BACKEND}/api/admin/devis/${seg}`;
    const try2 = `${BACKEND}/api/admin/devis?type=${encodeURIComponent(seg)}`;
    let r = await fetch(try1, opts);
    if (r.status === 404) r = await fetch(try2, opts);
    return r;
  }

  async function fetchAllTypes() {
    // on essaie chaque segment connu; on ignore les 404 éventuels
    const segs = Object.values(API_TYPE_MAP); // ["compression","torsion","traction","fil","grille","autre"]
    const results = await Promise.all(
      segs.map(async (seg) => {
        try {
          const r = await fetchOneType(seg);
          if (r.status === 401) throw new Error("__401__");
          if (r.status === 403) throw new Error("__403__");
          if (!r.ok) return [];
          const j = await r.json().catch(() => null);
          return Array.isArray(j?.items) ? j.items : [];
        } catch (e) {
          if (String(e?.message) === "__401__") throw e;
          if (String(e?.message) === "__403__") throw e;
          return [];
        }
      })
    );
    return results.flat();
  }

  // Charger la liste des demandes selon le type
  const loadDemandes = useCallback(async () => {
    try {
      setErr("");
      setLoading(true);

      let items = [];

      if (typeFilter === "all") {
        // ✅ ne plus appeler /devis/all : on fusionne toutes les listes
        items = await fetchAllTypes();
      } else {
        // type précis
        const seg = API_TYPE_MAP[typeFilter];
        const res = await fetchOneType(seg);

        if (res.status === 401) {
          router.push(`/fr/login?next=${encodeURIComponent("/fr/admin/devis/list")}`);
          return;
        }
        if (res.status === 403) {
          router.push(`/fr/unauthorized?code=403`);
          return;
        }

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.message || `Erreur (${res.status})`);
        items = Array.isArray(data.items) ? data.items : [];
      }

      setDemandes(items);
    } catch (e) {
      if (String(e?.message) === "__401__" || String(e?.message) === "__403__") {
        // redirections déjà gérées au-dessus
        return;
      }
      setErr(e?.message || "Erreur réseau");
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  }, [router, typeFilter]);

  useEffect(() => {
    loadDemandes();
  }, [loadDemandes]);

  // Construire lignes (groupées par devis)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRowsLoading(true);
      try {
        if (!demandes.length) {
          setRows([]);
          return;
        }

        const list = await Promise.all(
          demandes.map(async (d) => {
            try {
              const r = await fetch(
                `${BACKEND}/api/devis/admin/by-demande/${d._id}?numero=${encodeURIComponent(d?.numero || "")}`,
                { credentials: "include" }
              );
              const j = await r.json().catch(() => null);
              if (!j?.success || !j?.exists) return null;

              const client = `${d?.user?.prenom || ""} ${d?.user?.nom || ""}`.trim();
              const date = j?.devis?.createdAt || d?.createdAt || "";

              const metaNums = Array.isArray(j?.demandeNumeros)
                ? j.demandeNumeros
                : Array.isArray(j?.devis?.meta?.demandes)
                ? j.devis.meta.demandes.map((x) => x?.numero).filter(Boolean)
                : j?.devis?.demandeNumero
                ? [j.devis.demandeNumero]
                : [d.numero];

              const metaTypesRaw = Array.isArray(j?.devis?.meta?.demandes)
                ? j.devis.meta.demandes.map((x) => x?.type || x?.typeDemande || x?.kind).filter(Boolean)
                : j?.devis?.typeDemande || j?.devis?.type || j?.type
                ? [j.devis.typeDemande || j.devis.type || j.type]
                : [];

              // fallbacks : type sur la demande, puis valeur du select (si ≠ all)
              const types = uniq(
                [
                  ...(metaTypesRaw || []),
                  d?.type,
                  typeFilter !== "all" ? typeFilter : null,
                ]
                  .filter(Boolean)
                  .map(normalizeType)
              ).filter(Boolean);

              return {
                demandeId: d._id,
                demandeNumero: d.numero,
                client,
                devisNumero: j?.devis?.numero || "",
                devisPdf: j?.pdf || "",
                date,
                demandeNumeros: metaNums.length ? uniq(metaNums) : [d.numero],
                types,
              };
            } catch {
              return null;
            }
          })
        );

        if (cancelled) return;

        const base = list.filter(Boolean);
        const groupedMap = new Map();

        for (const r of base) {
          const key = r.devisNumero || r.demandeId;
          const g = groupedMap.get(key);
          if (!g) {
            groupedMap.set(key, {
              ...r,
              demandeNumeros: uniq(r.demandeNumeros || [r.demandeNumero]),
              types: uniq(r.types || []),
            });
          } else {
            g.demandeNumeros = uniq([...(g.demandeNumeros || []), ...(r.demandeNumeros || [r.demandeNumero])]);
            g.types = uniq([...(g.types || []), ...(r.types || [])]);
            if (new Date(r.date).getTime() > new Date(g.date).getTime()) g.date = r.date;
          }
        }

        const compact = Array.from(groupedMap.values()).sort((a, b) => {
          const ta = new Date(a.date || 0).getTime();
          const tb = new Date(b.date || 0).getTime();
          return tb - ta;
        });

        setRows(compact);
        setPage(1);
      } finally {
        if (!cancelled) setRowsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demandes, typeFilter]);

  // Filtrage (recherche plein texte)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const client = (r.client || "").toLowerCase();
      const devisNum = (r.devisNumero || "").toLowerCase();
      const demNums = ((r.demandeNumeros && r.demandeNumeros.join(" ")) || r.demandeNumero || "").toLowerCase();
      const typesStr = (r.types || []).join(" ").toLowerCase();
      const dateStr = shortDate(r.date).toLowerCase();
      return (
        client.includes(needle) ||
        devisNum.includes(needle) ||
        demNums.includes(needle) ||
        typesStr.includes(needle) ||
        dateStr.includes(needle)
      );
    });
  }, [rows, q]);

  // Pagination
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [filtered.length, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const { pageItems, total } = useMemo(() => {
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return { pageItems: filtered.slice(start, end), total };
  }, [filtered, page, pageSize]);

  const isBusy = loading || rowsLoading;

  return (
    <div className="py-6 space-y-6 sm:space-y-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        {/* Header (centré) */}
        <header className="space-y-4 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B1E3A]">
            Liste des devis (par demande)
          </h1>
          {err && <p className="text-sm text-red-600">{err}</p>}

          {/* Select + Search sous le titre */}
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-[240px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-[#0B1E3A] shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
              title="Type de demande"
            >
              <option value="all">Tous les types</option>
              <option value="compression">Compression</option>
              <option value="torsion">Torsion</option>
              <option value="traction">Traction</option>
              <option value="filDresse">Fil dressé coupé</option>
              <option value="grille">Grille métallique</option>
              <option value="autre">Autre article</option>
            </select>

            <div className="relative w-full sm:w-[520px]">
              <FiSearch
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher : devis, demande, client, type, date…"
                aria-label="Recherche devis"
                className="w-full rounded-xl border border-gray-300 bg-white px-9 pr-9 py-2 text-sm text-[#0B1E3A]
                           shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Effacer la recherche"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center
                             h-6 w-6 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                >
                  <FiXCircle size={16} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Section encadrée */}
        <section className="rounded-2xl border border-[#F7C60022] bg-white p-0 shadow-[0_6px_22px_rgba(0,0,0,.06)]">
          {isBusy ? (
            <div className="px-6 py-6 space-y-3 animate-pulse">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
          ) : total === 0 ? (
            <p className="px-6 py-6 text-gray-500">Aucun devis trouvé.</p>
          ) : (
            <>
              {/* ≥ md : Table */}
              <div className="hidden md:block">
                <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <colgroup>
                        <col className="w-[16%]" />
                        <col className="w-[24%]" />
                        <col className="w-[18%]" />
                        <col className="w-[22%]" />
                        <col className="w-[12%]" />
                        <col className="w-[8%]" />
                      </colgroup>

                      <thead className="sticky top-0 z-10">
                        <tr className="bg-white">
                          {["N° Devis", "N° Demande(s)", "Type(s)", "Client", "Date", "PDF"].map((h) => (
                            <th key={h} className={h === "PDF" ? "p-4 text-right" : "p-4 text-left"}>
                              <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                                {h}
                              </div>
                            </th>
                          ))}
                        </tr>
                        <tr>
                          <td colSpan={6}>
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                          </td>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {pageItems.map((r) => (
                          <tr key={r.devisNumero || r.demandeId} className="bg-white hover:bg-[#0B1E3A]/[0.03] transition-colors">
                            {/* N° Devis + cercle jaune */}
                            <td className="p-4 align-top font-mono">
                              <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-[#F7C600] inline-block" />
                                <span>{r.devisNumero}</span>
                              </div>
                            </td>

                            {/* N° demandes */}
                            <td className="p-4 align-top">
                              {r.demandeNumeros?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {r.demandeNumeros.map((n) => (
                                    <span
                                      key={n}
                                      className="inline-flex items-center rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px] font-mono"
                                    >
                                      {n}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="font-mono">{r.demandeNumero}</span>
                              )}
                            </td>

                            {/* Types */}
                            <td className="p-4 align-top">
                              {r.types?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {r.types.map((t) => (
                                    <span
                                      key={t}
                                      className="inline-flex items-center rounded-full bg-[#0B1E3A]/5 border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px]"
                                    >
                                      {displayType(t)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>

                            {/* Client */}
                            <td className="p-4 align-top">
                              <span className="block truncate" title={r.client}>
                                {r.client}
                              </span>
                            </td>

                            {/* Date */}
                            <td className="p-4 align-top">{shortDate(r.date)}</td>

                            {/* PDF */}
                            <td className="p-4 align-top">
                              <div className="flex items-center justify-end">
                                {r.devisPdf ? (
                                  <a
                                    href={r.devisPdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full border border-[#0B1E3A]/20 bg-[#0B1E3A]/5 px-3 py-1 text-[12px] hover:bg-[#0B1E3A]/10"
                                    title="Ouvrir PDF"
                                  >
                                    <FiFileText size={14} />
                                    Ouvrir PDF
                                  </a>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* < md : Cartes */}
              <div className="md:hidden grid grid-cols-1 gap-3 px-4 py-4">
                {pageItems.map((r) => (
                  <div key={r.devisNumero || r.demandeId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500">N° Devis</p>
                        <div className="mt-0.5 flex items-center gap-2 text-[#0B1E3A]">
                          <span className="h-3 w-3 rounded-full bg-[#F7C600] inline-block" />
                          <span className="font-mono">{r.devisNumero}</span>
                        </div>

                        <p className="mt-3 text-xs font-semibold text-gray-500">Demande(s)</p>
                        <p className="font-mono text-[#0B1E3A]">
                          {r.demandeNumeros?.length ? r.demandeNumeros.join(", ") : r.demandeNumero}
                        </p>

                        <p className="mt-3 text-xs font-semibold text-gray-500">Type(s)</p>
                        <p className="text-[#0B1E3A]">
                          {r.types?.length ? r.types.map(displayType).join(", ") : <span className="text-gray-400">—</span>}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-500">Client</p>
                            <p className="truncate" title={r.client}>{r.client}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500">Date</p>
                            <p>{shortDate(r.date)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {r.devisPdf ? (
                          <a
                            href={r.devisPdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-[#0B1E3A]/20 bg-[#0B1E3A]/5 text-[#0B1E3A] hover:bg-[#0B1E3A]/10 transition"
                            title="Ouvrir PDF"
                          >
                            <FiFileText size={18} />
                          </a>
                        ) : (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-400">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="px-4 pb-5">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[5,10, 20, 50]}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

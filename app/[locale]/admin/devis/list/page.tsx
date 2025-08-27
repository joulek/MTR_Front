"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiSearch, FiXCircle } from "react-icons/fi";
import Pagination from "@/components/Pagination";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const WRAP = "mx-auto w-full max-w-5xl px-3 sm:px-4";

/* Helpers */
function shortDate(d: any) {
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
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

type Demande = {
  _id: string;
  numero: string;
  createdAt?: string;
  user?: { prenom?: string; nom?: string; _id?: string };
};

type DevisRow = {
  demandeId: string;
  demandeNumero: string;
  client: string;
  devisNumero: string;
  devisPdf: string;
  date: string;
  totalHT?: number | string;
  status?: string;
  demandeNumeros?: string[];
  types?: string[]; // 👈 الأنواع (compression, torsion, ...)
};

type TypeFilter = "compression" | "torsion" | "filDresse" | "grille" | "autre" |"traction";

export default function DevisList() {
  const router = useRouter();

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(true);

  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [rows, setRows] = useState<DevisRow[]>([]);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 👇 فلتر النوع
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("compression");

  // محاولة ذكية لاختيار الـendpoint حسب النوع
  async function fetchDemandesByType(t: TypeFilter) {
    // 1) REST على شكل /api/admin/devis/<type>
    const try1 =
      t === "compression"
        ? `${BACKEND}/api/admin/devis/compression`
        : `${BACKEND}/api/admin/devis/${t}`;

    // 2) Fallback: /api/admin/devis?type=<type>
    const try2 = `${BACKEND}/api/admin/devis?type=${encodeURIComponent(t)}`;

    const opts: RequestInit = {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    };

    let res = await fetch(try1, opts);
    if (res.status === 404) res = await fetch(try2, opts); // جرّب بديل
    return res;
  }

  // ----- load demandes (حسب النوع) -----
  const loadDemandes = useCallback(async () => {
    try {
      setErr("");
      setLoading(true);

      const res = await fetchDemandesByType(typeFilter);

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
      setDemandes(data.items || []);
    } catch (e: any) {
      setErr(e?.message || "Erreur réseau");
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  }, [router, typeFilter]);

  useEffect(() => {
    loadDemandes();
  }, [loadDemandes]);

  // ----- fetch devis-by-demande + group by devis -----
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

              // 👇 أرقام الديماندات
              const metaNums: string[] = Array.isArray(j?.demandeNumeros)
                ? j.demandeNumeros
                : Array.isArray(j?.devis?.meta?.demandes)
                ? j.devis.meta.demandes.map((x: any) => x?.numero).filter(Boolean)
                : j?.devis?.demandeNumero
                ? [j.devis.demandeNumero]
                : [d.numero];

              // 👇 الأنواع
              const metaTypes: string[] = Array.isArray(j?.devis?.meta?.demandes)
                ? j.devis.meta.demandes.map((x: any) => x?.type).filter(Boolean)
                : j?.devis?.typeDemande
                ? [j.devis.typeDemande]
                : [];

              const row: DevisRow = {
                demandeId: d._id,
                demandeNumero: d.numero,
                client,
                devisNumero: j?.devis?.numero || "",
                devisPdf: j?.pdf || "",
                date,
                totalHT: j?.devis?.totalHT ?? undefined,
                status: j?.devis?.status ?? undefined,
                demandeNumeros: metaNums.length ? uniq(metaNums) : [d.numero],
                types: uniq(metaTypes.map((t) => String(t || "").toLowerCase())),
              };
              return row;
            } catch {
              return null;
            }
          })
        );

        if (cancelled) return;

        const base = (list.filter(Boolean) as DevisRow[]);
        const groupedMap = new Map<string, DevisRow>();

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
  }, [demandes]);

  // ----- filtering -----
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const client = (r.client || "").toLowerCase();
      const devisNum = (r.devisNumero || "").toLowerCase();
      const demNums = ((r.demandeNumeros && r.demandeNumeros.join(" ")) || r.demandeNumero || "").toLowerCase();
      const typesStr = (r.types || []).join(" ").toLowerCase();
      const dateStr = shortDate(r.date).toLowerCase();
      return client.includes(needle) || devisNum.includes(needle) || demNums.includes(needle) || typesStr.includes(needle) || dateStr.includes(needle);
    });
  }, [rows, q]);

  // pagination
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [filtered.length, page, pageSize]);

  useEffect(() => { setPage(1); }, [q]);

  const { pageItems, total } = useMemo(() => {
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return { pageItems: filtered.slice(start, end), total };
  }, [filtered, page, pageSize]);

  const colWidths = ["w-[140px]", "w-[220px]", "w-[160px]", "w-[200px]", "w-[150px]", "w-[110px]", "w-auto"];
  const isBusy = loading || rowsLoading;

  return (
    <div className="py-6 space-y-4">
      {/* Header */}
      <div className={WRAP}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0B1E3A]">
            Liste des devis (par demande)
          </h1>

          <div className="flex w-full sm:w-auto gap-2">
            {/* 👇 Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-[#0B1E3A] shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
              title="Type de demande"
            >
              <option value="all">Tous les types</option>
              <option value="compression">Compression</option>
              <option value="torsion">Torsion</option>
              <option value="fil">Fil dressé coupé</option>
              <option value="grille">Grille métallique</option>
              <option value="autre">Autre article</option>
            </select>

            {/* search */}
            <div className="relative w-full sm:w-[320px]">
              <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher: devis, demande, client, type, date…"
                aria-label="Recherche devis"
                className="w-full rounded-lg border border-gray-300 bg-white px-8 pr-8 py-1.5 text-sm text-[#0B1E3A]
                           shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Effacer la recherche"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center
                             h-5 w-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                >
                  <FiXCircle size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {err && (
          <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700">
            {err}
          </p>
        )}
      </div>

      {/* Content */}
      <div className={WRAP}>
        {isBusy ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-6 bg-gray-100 rounded" />
            <div className="h-6 bg-gray-100 rounded" />
            <div className="h-6 bg-gray-100 rounded" />
          </div>
        ) : total === 0 ? (
          <p className="text-gray-500">Aucun devis trouvé.</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden sm:block">
              <table className="w-full table-fixed text-sm border-separate border-spacing-0">
                <colgroup>{colWidths.map((w, i) => <col key={i} className={w} />)}</colgroup>
                <thead>
                  <tr>
                    {["N° Devis", "N° Demande(s)", "Type(s)", "Client", "Date", "Total HT", "PDF"].map((h) => (
                      <th key={h} className="p-2 text-left align-bottom">
                        <div className="text-[13px] font-semibold uppercase tracking-wide text-slate-600">{h}</div>
                        <div className="mt-2 h-px w-full bg-gray-200" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-[#0B1E3A]">
                  {pageItems.map((r) => (
                    <tr key={r.devisNumero || r.demandeId} className="hover:bg-[#0B1E3A]/[0.03] transition-colors">
                      <td className="p-2 align-top border-b border-gray-200 font-mono">{r.devisNumero}</td>
                      <td className="p-2 align-top border-b border-gray-200 font-mono">
                        {r.demandeNumeros && r.demandeNumeros.length ? (
                          <div className="flex flex-wrap gap-1">
                            {r.demandeNumeros.map((n) => (
                              <span key={n} className="inline-flex items-center rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px]">
                                {n}
                              </span>
                            ))}
                          </div>
                        ) : (
                          r.demandeNumero
                        )}
                      </td>

                      {/* Type(s) */}
                      <td className="p-2 align-top border-b border-gray-200">
                        {r.types && r.types.length ? (
                          <div className="flex flex-wrap gap-1">
                            {r.types.map((t) => (
                              <span key={t} className="inline-flex items-center rounded-full bg-[#0B1E3A]/5 border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px] capitalize">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="p-2 align-top border-b border-gray-200">
                        <span className="block truncate" title={r.client}>{r.client}</span>
                      </td>
                      <td className="p-2 align-top border-b border-gray-200">{shortDate(r.date)}</td>
                      <td className="p-2 align-top border-b border-gray-200">
                        {r.totalHT != null ? String(r.totalHT) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="p-2 align-top border-b border-gray-200">
                        {r.devisPdf ? (
                          <a href={r.devisPdf} target="_blank" rel="noopener noreferrer"
                             className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px] hover:bg-[#0B1E3A]/5">
                            Ouvrir PDF
                          </a>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 20, 50]}
              />
            </div>

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-gray-200">
              {pageItems.map((r) => (
                <div key={r.devisNumero || r.demandeId} className="py-3">
                  <div className="flex items-center gap-2 text-[#0B1E3A]">
                    <span className="h-2 w-2 rounded-full bg-[#F7C600] shrink-0" />
                    <span className="font-mono">{r.devisNumero}</span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-gray-500">Demande(s)</p>
                      <p className="font-mono">
                        {r.demandeNumeros && r.demandeNumeros.length
                          ? r.demandeNumeros.join(", ")
                          : r.demandeNumero}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-gray-500">Type(s)</p>
                      <p className="font-mono capitalize">{(r.types || []).join(", ") || "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500">Date</p>
                      <p>{shortDate(r.date)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-gray-500">Client</p>
                      <p className="truncate" title={r.client}>{r.client}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Total HT</p>
                      <p>{r.totalHT != null ? String(r.totalHT) : "—"}</p>
                    </div>
                  </div>

                  <div className="mt-2">
                    {r.devisPdf ? (
                      <a href={r.devisPdf} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[12px] text-[#0B1E3A] hover:bg-[#0B1E3A]/5">
                        Ouvrir PDF
                      </a>
                    ) : <span className="text-gray-500">—</span>}
                  </div>
                </div>
              ))}

              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 20, 50]}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

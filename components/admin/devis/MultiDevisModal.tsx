"use client";
import { useEffect, useMemo, useState } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

type Line = {
  demandeId: string;
  ddvNumber: string;
  articleId: string;
  qty: number;
  remisePct: number;
  tvaPct: number;
};

export default function MultiDevisModal({
  open,
  onClose,
  demands,          // array de demandes sélectionnées
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  demands: any[];
  onCreated?: () => void;
}) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [creating, setCreating] = useState(false);

  const client = demands?.[0]?.user;

  useEffect(() => {
    if (!open) return;
    // init des lignes
    setLines(
      (demands || []).map((d) => ({
        demandeId: d._id,
        ddvNumber: d.numero,
        articleId: "",
        qty: Number(d?.quantite ?? 1) || 1,
        remisePct: 0,
        tvaPct: 19,
      }))
    );
    // charger articles
    (async () => {
      setLoadingArticles(true);
      try {
        const r = await fetch(`${BACKEND}/api/articles?limit=1000`, { cache: "no-store", credentials: "include" });
        const j = await r.json().catch(() => null);
        setArticles(j?.data ?? []);
      } catch {
        setArticles([]);
      } finally {
        setLoadingArticles(false);
      }
    })();
  }, [open, demands]);

  const getPU = (articleId: string) => {
    const a = articles.find((x) => x._id === articleId);
    return Number(a?.prixHT ?? a?.priceHT ?? 0) || 0;
  };

  const totals = useMemo(() => {
    let ht = 0, ttc = 0;
    for (const l of lines) {
      const pu = getPU(l.articleId);
      const q  = Number(l.qty || 0);
      const r  = Number(l.remisePct || 0);
      const v  = Number(l.tvaPct || 0);
      const lht = Math.max(0, pu * q * (1 - r/100));
      const lttc = lht * (1 + v/100);
      ht += lht; ttc += lttc;
    }
    const mfodec = +(ht * 0.01).toFixed(3);
    return { ht: +ht.toFixed(3), ttc: +(ttc + mfodec).toFixed(3) };
  }, [lines, articles]);

  const canSubmit = lines.length > 0 && lines.every(l => l.articleId && l.qty > 0);

  async function submit() {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const payload = {
        demandeIds: lines.map(l => l.demandeId),
        lines: lines.map(l => ({
          demandeId: l.demandeId,
          articleId: l.articleId,
          qty: Number(l.qty || 1),
          remisePct: Number(l.remisePct || 0),
          tvaPct: Number(l.tvaPct || 0),
        })),
        sendEmail: true,
      };
      const r = await fetch(`${BACKEND}/api/devis/admin/from-demande`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => null);
      if (!j?.success) throw new Error(j?.message || "Erreur création devis");
      onClose?.();
      onCreated?.();
      // tu peux aussi ouvrir j.pdf dans un nouvel onglet:
      if (j.pdf) window.open(j.pdf, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e.message || "Erreur réseau");
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow ring-1 ring-gray-200">
        <div className="px-6 pt-6 pb-3 border-b">
          <h3 className="text-xl font-semibold text-[#0B1E3A]">Créer un devis (multi-demandes)</h3>
          {client && (
            <p className="text-sm text-gray-600 mt-1">
              Client : <span className="font-medium">{`${client?.prenom || ""} ${client?.nom || ""}`.trim() || client?.email}</span>
            </p>
          )}
        </div>

        <div className="px-6 py-5 overflow-x-auto">
          <table className="min-w-[900px] w-full table-auto">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="p-2">DDV</th>
                <th className="p-2">Article</th>
                <th className="p-2 text-right">PU HT</th>
                <th className="p-2 text-right">Qté</th>
                <th className="p-2 text-right">Remise %</th>
                <th className="p-2 text-right">TVA %</th>
                <th className="p-2 text-right">Total HT</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map((ln, i) => {
                const pu = getPU(ln.articleId);
                const lht = Math.max(0, pu * Number(ln.qty || 0) * (1 - Number(ln.remisePct || 0)/100));

                return (
                  <tr key={ln.demandeId}>
                    <td className="p-2 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                        <span className="font-mono">{ln.ddvNumber}</span>
                      </div>
                    </td>
                    <td className="p-2 align-middle">
                      <select
                        className="w-full rounded border px-2 py-1"
                        value={ln.articleId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines(ls => ls.map((x, idx) => idx === i ? { ...x, articleId: v } : x));
                        }}
                      >
                        <option value="">— Choisir un article —</option>
                        {articles.map(a => (
                          <option key={a._id} value={a._id}>
                            {a.reference} — {a.designation}
                          </option>
                        ))}
                      </select>
                      {loadingArticles && <p className="text-xs text-gray-400 mt-1">Chargement…</p>}
                    </td>
                    <td className="p-2 align-middle text-right">{pu.toFixed(3)}</td>
                    <td className="p-2 align-middle text-right">
                      <input
                        type="number" min={1}
                        value={ln.qty}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value || 1));
                          setLines(ls => ls.map((x, idx) => idx === i ? { ...x, qty: v } : x));
                        }}
                        className="w-20 rounded border px-2 py-1 text-right"
                      />
                    </td>
                    <td className="p-2 align-middle text-right">
                      <input
                        type="number" min={0} max={100}
                        value={ln.remisePct}
                        onChange={(e) => {
                          const v = Math.min(100, Math.max(0, Number(e.target.value || 0)));
                          setLines(ls => ls.map((x, idx) => idx === i ? { ...x, remisePct: v } : x));
                        }}
                        className="w-20 rounded border px-2 py-1 text-right"
                      />
                    </td>
                    <td className="p-2 align-middle text-right">
                      <input
                        type="number" min={0} max={100}
                        value={ln.tvaPct}
                        onChange={(e) => {
                          const v = Math.min(100, Math.max(0, Number(e.target.value || 0)));
                          setLines(ls => ls.map((x, idx) => idx === i ? { ...x, tvaPct: v } : x));
                        }}
                        className="w-20 rounded border px-2 py-1 text-right"
                      />
                    </td>
                    <td className="p-2 align-middle text-right">{lht.toFixed(3)}</td>
                    <td className="p-2 align-middle text-right">
                      <button
                        onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))}
                        className="rounded bg-red-50 text-red-600 px-2 py-1 border border-red-200 hover:bg-red-100"
                      >
                        Retirer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totaux */}
          <div className="mt-4 flex justify-end gap-8 text-right">
            <div>
              <div className="text-sm text-gray-500">Total HT</div>
              <div className="text-lg font-semibold text-[#0B1E3A]">{totals.ht.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total TTC (avec 1% FODEC)</div>
              <div className="text-lg font-semibold text-[#0B1E3A]">{totals.ttc.toFixed(3)}</div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border px-4 py-2">Annuler</button>
          <button
            onClick={submit}
            disabled={!canSubmit || creating}
            className="rounded-xl bg-[#F7C600] text-[#0B1E3A] px-4 py-2 font-semibold shadow disabled:opacity-50"
          >
            {creating ? "Création…" : "Créer & envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}

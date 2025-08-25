"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function DevisModal({ open, onClose, demande }) {
  const router = useRouter();

  const [article, setArticle] = useState(null);
  const [articleLoaded, setArticleLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  const [numero, setNumero] = useState("");
  const [customNum, setCustomNum] = useState(false);

  const [quantite, setQuantite] = useState(1);
  const [remise, setRemise] = useState(0);
  const [tva, setTva] = useState(19);

  function goCreateArticle() {
    router.push(`/fr/admin/articles`);
  }

  async function fetchArticle() {
    setArticleLoaded(false);
    try {
      const num = demande?.numero || "";
      const url = `${BACKEND}/api/articles/by-demande?numero=${encodeURIComponent(num)}`;
      const r = await fetch(url, { credentials: "include" });
      const j = await r.json().catch(() => null);
      setArticle(j?.success ? j.item : null);
    } catch {
      setArticle(null);
    } finally {
      setArticleLoaded(true);
    }
  }

  useEffect(() => {
    if (!open || !demande?._id) return;

    fetchArticle();

    (async () => {
      try {
        const r = await fetch(`${BACKEND}/api/devis/admin/next-number`, { credentials: "include" });
        const j = await r.json().catch(() => null);
        if (j?.success && j?.numero) setNumero(j.numero);
      } catch {}
    })();

    setQuantite(Number(demande?.quantite ?? 1) || 1);
  }, [open, demande]);

  const puht = useMemo(() => {
    const n = Number(article?.prixHT ?? article?.priceHT ?? article?.puht ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, [article]);

  const totalHT = useMemo(() => {
    const q = Number(quantite) || 0;
    const r = Number(remise) || 0;
    return +(q * puht * (1 - r / 100)).toFixed(3);
  }, [puht, quantite, remise]);

  async function createDevis() {
    if (!article?._id) {
      alert("Aucun article n'est lié à cette demande.");
      return;
    }
    setLoading(true);
    try {
      const body = {
        articleId: article._id,
        quantite: Number(quantite) || 1,
        remisePct: Number(remise) || 0,
        tvaPct: Number(tva) || 0,
        sendEmail: true,
      };
      if (customNum && numero?.trim()) body.numero = numero.trim();

      const res = await fetch(`${BACKEND}/api/devis/admin/from-demande/${demande._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);

      if (json?.success) {
        setPdfUrl(json.pdf || "");
        // ⬇️ Fermer le modal immédiatement après la création
        onClose?.();
        // (optionnel) rafraîchir l’écran parent pour voir la liste à jour
        router.refresh?.();
      } else {
        alert(json?.message || "Échec de création du devis.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau lors de la création du devis.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Créer un devis</h2>

        {/* N° demande */}
        <div className="mb-3">
          <label className="block">N° demande</label>
          <input
            value={demande?.demandeNumero || demande?.numero || ""}
            readOnly
            className="w-full border rounded-lg p-2 bg-gray-100 cursor-not-allowed"
          />
        </div>

        {/* Article lié */}
        <div className="mb-3">
          <label className="block text-sm mb-1">Article lié à la demande</label>

          {!articleLoaded && <div className="rounded-lg border p-3 bg-gray-50 animate-pulse h-16" />}

          {articleLoaded && article && (
            <div className="rounded-lg border p-3 bg-gray-50">
              <div className="font-medium">
                {(article.reference || article.ref || "").toString()} — {(article.designation || article.name_fr || article.name_en || "").toString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                PU HT : <b>{puht.toFixed(3)}</b>
              </div>
              {article.demandeNumero && (
                <div className="text-xs text-gray-500 mt-1">
                  N° Demande lié : {article.demandeNumero}
                </div>
              )}
            </div>
          )}

          {articleLoaded && !article && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goCreateArticle}
                className="px-3 py-1.5 rounded-lg bg-yellow-500 text-white hover:brightness-95"
              >
                Créer l’article
              </button>
              <button
                type="button"
                onClick={fetchArticle}
                className="px-3 py-1.5 rounded-lg border"
                title="Rechercher à nouveau après création"
              >
                Rafraîchir
              </button>
            </div>
          )}
        </div>

        {/* Paramètres */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block mb-1">Qté</label>
            <input
              type="number" min={1}
              value={quantite} onChange={(e) => setQuantite(e.target.value)}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block mb-1">Remise %</label>
            <input
              type="number" min={0}
              value={remise} onChange={(e) => setRemise(e.target.value)}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block mb-1">TVA %</label>
            <select
              value={tva}
              onChange={(e) => setTva(Number(e.target.value))}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-yellow-500"
            >
              <option value={0}>0</option>
              <option value={7}>7</option>
              <option value={13}>13</option>
              <option value={19}>19</option>
            </select>
          </div>
        </div>

        {/* Totaux */}
        <div className="mt-4 bg-gray-50 rounded-lg p-2 flex justify-between">
          <span>PU HT: {puht.toFixed(3)}</span>
          <span>Total HT: {totalHT.toFixed(3)}</span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <button className="px-4 py-2 border rounded-lg" onClick={onClose}>Annuler</button>
          <button
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg disabled:opacity-50"
            onClick={createDevis}
            disabled={loading || !article?._id}
          >
            {loading ? "Création..." : "Créer & envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}

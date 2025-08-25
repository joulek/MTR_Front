"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiXCircle,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiX,
  FiCheck,
  FiChevronDown,
} from "react-icons/fi";
import { useTranslations } from "next-intl";
import Pagination from "@/components/Pagination";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// Largeur/espacement général (même logique que catégories)
const CARD_WRAPPER = "mx-auto w-full max-w-6xl px-3 sm:px-6";

export default function AdminArticlesPage() {
  const t = useTranslations("auth.articles");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Devis list pour le <select>
  const [devisList, setDevisList] = useState([]);
  const [loadingDevis, setLoadingDevis] = useState(false);

  // Recherche
  const [query, setQuery] = useState("");

  // Pagination (client)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modales
  const [isOpen, setIsOpen] = useState(false); // Add/Edit
  const [deleteOpen, setDeleteOpen] = useState(false); // Delete

  // Form
  const emptyForm = {
    _id: null,
    reference: "",
    designation: "",
    prixHT: "",
    numeroDevis: "",
  };
  const [form, setForm] = useState(emptyForm);
  const isEditing = useMemo(() => Boolean(form?._id), [form]);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // ===== API calls =====
  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/articles`, { cache: "no-store" });
      const json = await res.json();
      setItems(json?.data ?? []);
      setPage(1); // reset pagination au chargement
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevis = async () => {
    setLoadingDevis(true);
    try {
      const res = await fetch(`${BACKEND}/api/devis`, { cache: "no-store" });
      const json = await res.json();
      setDevisList(json?.data ?? []); // [{ _id, numero }]
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDevis(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchDevis();
  }, []);

  // options devis (inclut la valeur courante si manquante)
  const devisOptions = useMemo(() => {
    const arr = [...devisList];
    if (form.numeroDevis && !arr.some((d) => d.numero === form.numeroDevis)) {
      arr.unshift({ _id: "__current__", numero: form.numeroDevis });
    }
    return arr;
  }, [devisList, form.numeroDevis]);

  // ===== UI actions =====
  const openAdd = () => {
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (it) => {
    setForm({
      _id: it._id,
      reference: it.reference ?? "",
      designation: it.designation ?? "",
      prixHT: (it.prixHT ?? "").toString(),
      numeroDevis: it.numeroDevis ?? "",
    });
    setIsOpen(true);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "prixHT" ? value.replace(",", ".") : value,
    }));
  };

  const validForm = () => {
    if (!form.reference?.trim()) return t("errors.requiredReference");
    if (!form.designation?.trim()) return t("errors.requiredDesignation");
    if (form.prixHT === "" || isNaN(Number(form.prixHT)) || Number(form.prixHT) < 0)
      return t("errors.invalidHT");
    return null;
  };

  const submitForm = async (e) => {
    e?.preventDefault?.();
    const err = validForm();
    if (err) return alert(err);

    setSubmitting(true);
    try {
      const payload = {
        reference: form.reference.trim(),
        designation: form.designation.trim(),
        prixHT: Number(form.prixHT),
        numeroDevis: form.numeroDevis?.trim() || "",
      };

      const url = isEditing
        ? `${BACKEND}/api/articles/${form._id}`
        : `${BACKEND}/api/articles`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Erreur serveur");
      setIsOpen(false);
      setForm(emptyForm);
      await fetchItems();
    } catch (e) {
      console.error(e);
      alert(e.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (it) => {
    setToDelete(it);
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!toDelete?._id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BACKEND}/api/articles/${toDelete._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Erreur serveur");
      setDeleteOpen(false);
      setToDelete(null);
      await fetchItems();
    } catch (e) {
      console.error(e);
      alert(e.message || "Erreur");
    } finally {
      setDeleting(false);
    }
  };

  // ===== Filtrage (référence / désignation / n° devis) =====
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const r = (it.reference || "").toLowerCase();
      const d = (it.designation || "").toLowerCase();
      const n = (it.numeroDevis || "").toLowerCase();
      return r.includes(q) || d.includes(q) || n.includes(q);
    });
  }, [items, query]);

  // ===== Pagination client =====
  const total = filtered.length;

  // clamp page si la taille/filtre change
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [total, page, pageSize]);

  // reset page quand on tape
  useEffect(() => {
    setPage(1);
  }, [query]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // largeurs de colonnes sans whitespace dans <colgroup>
  const colWidths = ["w-[18%]", "w-[32%]", "w-[12%]", "w-[12%]", "w-[16%]", "w-[10%]"];

  return (
    <div className="py-6 space-y-6 sm:space-y-8">
      {/* ======= Header + Search (style Catégories) ======= */}
      <div className={CARD_WRAPPER}>
        <header className="space-y-4 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E3A]">
            {t("title")}
          </h1>

          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="relative w-full sm:w-[520px]">
              <FiSearch
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-xl border border-gray-300 bg-white px-9 pr-9 py-2 text-sm text-[#0B1E3A]
                           shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                aria-label={t("searchAria")}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("clearSearch")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center
                             h-6 w-6 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                >
                  <FiXCircle size={16} />
                </button>
              )}
            </div>

            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F7C600] text-[#0B1E3A] px-4 py-2 font-semibold shadow hover:brightness-105 active:translate-y-[1px] transition whitespace-nowrap"
            >
              <FiPlus /> {t("addButton")}
            </button>
          </div>
        </header>
      </div>

      {/* ======= Liste ======= */}
      <div className={CARD_WRAPPER}>
        <section className="rounded-2xl border border-[#F7C60022] bg-white shadow-[0_6px_22px_rgba(0,0,0,.06)]">
          {loading ? (
            <div className="px-6 py-6 space-y-3 animate-pulse">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
          ) : total === 0 ? (
            <p className="px-6 py-6 text-gray-500">{t("noData")}</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-[840px] w-full table-auto">
                    <colgroup>
                      {colWidths.map((w, i) => (
                        <col key={i} className={w} />
                      ))}
                    </colgroup>

                    <thead>
                      <tr className="bg-white">
                        <th className="p-3 text-left">
                          <div className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("table.reference")}
                          </div>
                        </th>
                        <th className="p-3 text-left">
                          <div className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("table.designation")}
                          </div>
                        </th>
                        <th className="p-3 text-right">
                          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("table.priceHT")}
                          </div>
                        </th>
                        <th className="p-3 text-right">
                          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("table.priceTTC")}
                          </div>
                        </th>
                        <th className="p-3 text-left">
                          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("table.quoteNumber")}
                          </div>
                        </th>
                        <th className="p-3 text-right">
                          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("table.actions")}
                          </div>
                        </th>
                      </tr>
                      <tr>
                        <td colSpan={6}>
                          <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                        </td>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {pageItems.map((it) => (
                        <tr
                          key={it._id}
                          className="bg-white hover:bg-[#0B1E3A]/[0.03] transition-colors"
                        >
                          <td className="p-3 align-middle">
                            <div className="flex items-center gap-3">
                              <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                              <span className="text-[#0B1E3A] font-medium">
                                {it.reference}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 align-middle">
                            <span className="text-slate-700">{it.designation}</span>
                          </td>
                          <td className="p-3 align-middle text-right text-[#0B1E3A]">
                            {Number(it.prixHT).toFixed(4)}
                          </td>
                          <td className="p-3 align-middle text-right text-[#0B1E3A]">
                            {Number(it.prixTTC ?? it.prixHT * 1.2).toFixed(4)}
                          </td>
                          <td className="p-3 align-middle text-[#0B1E3A]">
                            {it.numeroDevis || t("misc.none")}
                          </td>
                          <td className="p-3 align-middle">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(it)}
                                className="inline-flex h-9 items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 text-[13px] font-medium text-yellow-800 hover:bg-yellow-100 hover:shadow-sm transition"
                                title={t("actions.edit")}
                                aria-label={t("actions.edit")}
                              >
                                <FiEdit2 size={16} />
                              </button>
                              <button
                                onClick={() => confirmDelete(it)}
                                className="inline-flex h-9 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 text-[13px] font-medium text-red-700 hover:bg-red-100 hover:shadow-sm transition"
                                title={t("actions.delete")}
                                aria-label={t("actions.delete")}
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination (desktop) */}
                <div className="px-4 py-4">
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

              {/* Mobile cards */}
              <div className="md:hidden grid grid-cols-1 gap-3 px-4 py-4">
                {pageItems.map((it) => (
                  <div
                    key={it._id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500">
                          {t("table.reference")}
                        </p>
                        <p className="font-medium text-[#0B1E3A] flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                          {it.reference}
                        </p>

                        <p className="mt-3 text-xs font-semibold text-gray-500">
                          {t("table.designation")}
                        </p>
                        <p className="text-[#0B1E3A]">{it.designation}</p>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-gray-500">
                              {t("table.priceHT")}
                            </p>
                            <p className="text-[#0B1E3A]">
                              {Number(it.prixHT).toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500">
                              {t("table.priceTTC")}
                            </p>
                            <p className="text-[#0B1E3A]">
                              {Number(it.prixTTC ?? it.prixHT * 1.2).toFixed(4)}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 text-xs font-semibold text-gray-500">
                          {t("table.quoteNumber")}
                        </p>
                        <p className="text-[#0B1E3A]">
                          {it.numeroDevis || (
                            <span className="text-gray-400">{t("misc.none")}</span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => openEdit(it)}
                          className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 transition"
                          aria-label={t("actions.edit")}
                          title={t("actions.edit")}
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => confirmDelete(it)}
                          className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
                          aria-label={t("actions.delete")}
                          title={t("actions.delete")}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination (mobile) */}
                <div className="pt-2">
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
            </>
          )}
        </section>
      </div>

      {/* ======= Modale Ajouter/Éditer ======= */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-edit-title"
        >
          <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,.25)] ring-1 ring-gray-100">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-400 shadow-lg ring-4 ring-white flex items-center justify-center text-[#0B1E3A]">
              {isEditing ? <FiEdit2 size={22} /> : <FiPlus size={22} />}
            </div>

            <div className="px-6 pt-10 pb-4 border-b border-gray-100 text-center">
              <h3 id="add-edit-title" className="text-xl font-semibold text-[#0B1E3A]">
                {isEditing ? t("form.editTitle") : t("form.addTitle")}
              </h3>
            </div>

            <form onSubmit={submitForm} className="px-6 py-6 space-y-5">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">
                  {t("labels.reference")} <span className="text-red-500">*</span>
                </span>
                <input
                  name="reference"
                  value={form.reference}
                  onChange={onChange}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                  placeholder={t("placeholders.refExample")}
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">
                  {t("labels.designation")} <span className="text-red-500">*</span>
                </span>
                <input
                  name="designation"
                  value={form.designation}
                  onChange={onChange}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                  placeholder={t("placeholders.designationExample")}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">
                    {t("labels.priceHT")} <span className="text-red-500">*</span>
                  </span>
                  <input
                    name="prixHT"
                    value={form.prixHT}
                    onChange={onChange}
                    type="number"
                    step="0.001"
                    min="0"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                    placeholder={t("placeholders.priceExample")}
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">
                    {t("labels.quoteNumber")}
                  </span>
                  <div className="relative">
                    <select
                      name="numeroDevis"
                      value={form.numeroDevis}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, numeroDevis: e.target.value }))
                      }
                      className="appearance-none w-full rounded-xl border border-gray-200 bg-white px-3 pr-10 py-2 text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                    >
                      <option value="">{t("placeholders.select")}</option>
                      {devisOptions.map((d) => (
                        <option key={(d._id ?? "") + d.numero} value={d.numero}>
                          {d.numero}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                  {loadingDevis && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t("loadingQuotes")}
                    </p>
                  )}
                </label>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0B1E3A] bg-white px-4 py-2 text-sm hover:bg-gray-50 transition text-[#0B1E3A]"
                  disabled={submitting}
                >
                  <FiX /> {t("form.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition shadow"
                >
                  <FiCheck />
                  {submitting
                    ? isEditing
                      ? t("form.updating")
                      : t("form.creating")
                    : isEditing
                    ? t("form.update")
                    : t("form.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======= Modale Suppression ======= */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,.25)] ring-1 ring-gray-100">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full bg-gradient-to-br from-rose-500 to-red-600 shadow-lg ring-4 ring-white flex items-center justify-center text-white">
              <FiTrash2 size={22} />
            </div>

            <div className="px-6 pt-10 pb-4 border-b border-gray-100 text-center">
              <h3 id="delete-title" className="text-xl font-semibold text-[#0B1E3A]">
                {t("delete.title")}
              </h3>
            </div>

            <div className="px-6 py-6 text-sm text-gray-700">
              {t("delete.confirm")}{" "}
              <span className="font-semibold">{toDelete?.reference}</span> ?
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteOpen(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#0B1E3A] bg-white px-4 py-2 text-sm hover:bg-gray-50 transition text-[#0B1E3A]"
                disabled={deleting}
              >
                <FiX /> {t("form.cancel")}
              </button>
              <button
                onClick={doDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition shadow"
              >
                <FiTrash2 /> {deleting ? t("delete.deleting") : t("delete.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

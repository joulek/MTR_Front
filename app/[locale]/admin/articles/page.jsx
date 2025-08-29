"use client";

import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiXCircle, FiEdit2, FiTrash2, FiPlus, FiX, FiCheck } from "react-icons/fi";
import { useTranslations } from "next-intl";
import Pagination from "@/components/Pagination";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const CARD_WRAPPER = "mx-auto w-full max-w-6xl px-3 sm:px-6";

export default function AdminArticlesPage() {
  const t = useTranslations("auth.articles");

  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isOpen, setIsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const emptyForm = {
    _id: null,
    reference: "",     // preview فقط
    designation: "",
    prixHT: "",
    type: "",
  };
  const [form, setForm] = useState(emptyForm);
  const isEditing = !!form?._id;

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // ===== API =====
  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/articles`, { cache: "no-store" });
      const json = await res.json();
      setItems(json?.data ?? []);
      setPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${BACKEND}/api/produits`, { cache: "no-store" });
      const json = await res.json();
      setProducts(json?.data ?? []); // [{ _id, name_fr }]
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchNextRef = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/articles/next-ref`, { cache: "no-store" });
      const json = await res.json();
      setForm((f) => ({ ...f, reference: json?.data || "" })); // ex: ART-12
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchProducts();
  }, []);

  // ===== Actions UI =====
  const openAdd = () => {
    setForm(emptyForm);
    setIsOpen(true);
    fetchNextRef(); // معاينة المرجع القادم
  };

  const openEdit = (it) => {
    setForm({
      _id: it._id,
      reference: it.reference ?? "",
      designation: it.designation ?? "",
      prixHT: (it.prixHT ?? "").toString(),
      type: it.type?._id || it.type || "",
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

  // غيّر الـ designation في كل مرة يتبدّل الـ type
  const onTypeChange = (e) => {
    const value = e.target.value;
    const prod = products.find((p) => p._id === value);
    setForm((f) => ({
      ...f,
      type: value,
      designation: prod?.name_fr || "",
    }));
  };

  const validForm = () => {
    if (!form.type) return t("errors.requiredType");
    if (!form.designation?.trim()) return t("errors.requiredDesignation");
    if (form.prixHT === "" || isNaN(Number(form.prixHT)) || Number(form.prixHT) < 0) {
      return t("errors.invalidHT");
    }
    return null;
  };

  const submitForm = async (e) => {
    e?.preventDefault?.();
    const err = validForm();
    if (err) return alert(err);

    setSubmitting(true);
    try {
      const payload = {
        designation: form.designation.trim(),
        prixHT: Number(form.prixHT),
        type: form.type,
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
      const res = await fetch(`${BACKEND}/api/articles/${toDelete._id}`, { method: "DELETE" });
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

  // ===== Filtrage (réf/design/type) =====
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const r = (it.reference || "").toLowerCase();
      const d = (it.designation || "").toLowerCase();
      const ty = (it.type?.name_fr || it.typeName || "").toLowerCase();
      return r.includes(q) || d.includes(q) || ty.includes(q);
    });
  }, [items, query]);

  // ===== Pagination =====
  const total = filtered.length;
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [total, page, pageSize]);
  useEffect(() => setPage(1), [query]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const colWidths = ["w-[16%]", "w-[32%]", "w-[20%]", "w-[16%]", "w-[16%]"]; // ref, design, type, HT, TTC

  return (
    <div className="py-6 space-y-6 sm:space-y-8">
      {/* Header + Search */}
      <div className={CARD_WRAPPER}>
        <header className="space-y-4 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E3A]">
            {t("title")}
          </h1>

        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="relative w-full sm:w-[520px]">
              <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-xl border border-gray-300 bg-white px-9 pr-9 py-2 text-sm text-[#0B1E3A] shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                aria-label={t("searchAria")}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("clearSearch")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
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

      {/* Liste */}
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
                  <table className="min-w-[960px] w-full table-auto">
                    <colgroup>
                      {colWidths.map((w, i) => (<col key={i} className={w} />))}
                    </colgroup>
                    <thead>
                      <tr className="bg-white">
                        <th className="p-3 text-left"><div className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{t("table.reference")}</div></th>
                        <th className="p-3 text-left"><div className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{t("table.designation")}</div></th>
                        <th className="p-3 text-left"><div className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{t("table.type")}</div></th>
                        <th className="p-3 text-right"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.priceHT")}</div></th>
                        <th className="p-3 text-right"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.priceTTC")}</div></th>
                      </tr>
                      <tr><td colSpan={5}><div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" /></td></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pageItems.map((it) => (
                        <tr key={it._id} className="bg-white hover:bg-[#0B1E3A]/[0.03] transition-colors">
                          <td className="p-3 align-middle">
                            <div className="flex items-center gap-3">
                              <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                              <span className="text-[#0B1E3A] font-medium">{it.reference}</span>
                            </div>
                          </td>
                          <td className="p-3 align-middle"><span className="text-slate-700">{it.designation}</span></td>
                          <td className="p-3 align-middle"><span className="text-slate-700">{it.type?.name_fr || it.typeName || "-"}</span></td>
                          <td className="p-3 align-middle text-right text-[#0B1E3A]">{Number(it.prixHT).toFixed(4)}</td>
                          <td className="p-3 align-middle text-right text-[#0B1E3A]">{Number(it.prixTTC ?? it.prixHT * 1.2).toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

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
                  <div key={it._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-500">{t("table.reference")}</p>
                      <p className="font-medium text-[#0B1E3A] flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#F7C600]" />{it.reference}
                      </p>

                      <p className="mt-3 text-xs font-semibold text-gray-500">{t("table.designation")}</p>
                      <p className="text-[#0B1E3A]">{it.designation}</p>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-gray-500">{t("table.type")}</p>
                          <p className="text-[#0B1E3A]">{it.type?.name_fr || it.typeName || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">{t("table.priceHT")}</p>
                          <p className="text-[#0B1E3A]">{Number(it.prixHT).toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">{t("table.priceTTC")}</p>
                          <p className="text-[#0B1E3A]">{Number(it.prixTTC ?? it.prixHT * 1.2).toFixed(4)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3">
                      <button onClick={() => openEdit(it)} className="inline-flex h-9 items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 text-[13px] font-medium text-yellow-800 hover:bg-yellow-100 hover:shadow-sm transition">
                        <FiEdit2 size={16} />
                      </button>
                      <button onClick={() => { setToDelete(it); setDeleteOpen(true); }} className="inline-flex h-9 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 text-[13px] font-medium text-red-700 hover:bg-red-100 hover:shadow-sm transition">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

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

      {/* Modale Ajouter/Éditer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="add-edit-title">
          <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,.25)] ring-1 ring-gray-100">
            <div className="px-6 pt-8 pb-4 border-b border-gray-100 text-center">
              <h3 id="add-edit-title" className="text-xl font-semibold text-[#0B1E3A]">
                {isEditing ? t("form.editTitle") : t("form.addTitle")}
              </h3>
            </div>

            <form onSubmit={submitForm} className="px-6 py-6 space-y-5">


              {/* Type */}
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">
                  {t("labels.type")} <span className="text-red-500">*</span>
                </span>
                <select
                  name="type"
                  value={form.type}
                  onChange={onTypeChange}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                  disabled={loadingProducts}
                >
                  <option value="">{t("placeholders.selectType")}</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>{p.name_fr}</option>
                  ))}
                </select>
              </label>

              {/* Désignation */}
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

              {/* Prix HT */}
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

              <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsOpen(false)} className="inline-flex items-center gap-2 rounded-xl border border-[#0B1E3A] bg-white px-4 py-2 text-sm hover:bg-gray-50 transition text-[#0B1E3A]" disabled={submitting}>
                  <FiX /> {t("form.cancel")}
                </button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition shadow">
                  <FiCheck />
                  {submitting ? (isEditing ? t("form.updating") : t("form.creating")) : (isEditing ? t("form.update") : t("form.create"))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Suppression */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,.25)] ring-1 ring-gray-100">
            <div className="px-6 pt-8 pb-4 border-b border-gray-100 text-center">
              <h3 id="delete-title" className="text-xl font-semibold text-[#0B1E3A]">{t("delete.title")}</h3>
            </div>
            <div className="px-6 py-6 text-sm text-gray-700">
              {t("delete.confirm")} <span className="font-semibold">{toDelete?.reference}</span> ?
            </div>
            <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button onClick={() => setDeleteOpen(false)} className="inline-flex items-center gap-2 rounded-xl border border-[#0B1E3A] bg-white px-4 py-2 text-sm hover:bg-gray-50 transition text-[#0B1E3A]" disabled={deleting}>
                <FiX /> {t("form.cancel")}
              </button>
              <button onClick={doDelete} disabled={deleting} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition shadow">
                <FiTrash2 /> {deleting ? t("delete.deleting") : t("delete.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

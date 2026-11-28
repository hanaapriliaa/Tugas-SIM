"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/ButtonLink";
import { AlertCircleIcon, CheckIcon, SlidersIcon } from "@/components/ui/icons";
import {
  fetchAdminTemplatesApi,
  resetAdminTemplatesApi,
  saveAdminTemplateApi,
} from "@/lib/admin-client";
import { garmentCategories } from "@/lib/booking-options";
import { formatDateTimeId } from "@/lib/order-tracking";
import type {
  GarmentCategoryId,
  MeasurementTemplateConfig,
  MeasurementTemplateField,
  MeasurementTemplateId,
} from "@/lib/types/tailor";

const inputClass =
  "w-full rounded-xl border border-cocoa/20 bg-ivory px-3 py-2 text-sm text-espresso outline-none transition-colors focus:border-espresso";

function cloneTemplateForEdit(template: MeasurementTemplateConfig): MeasurementTemplateConfig {
  return {
    ...template,
    supportedCategories: [...template.supportedCategories],
    fields: template.fields.map((field) => ({
      ...field,
      guideSteps: [...field.guideSteps],
    })),
    sizePresets: template.sizePresets.map((preset) => ({
      ...preset,
      values: { ...preset.values },
      extraValues: preset.extraValues ? { ...preset.extraValues } : undefined,
    })),
  };
}

export function AdminTemplateManager() {
  const [templates, setTemplates] = useState<MeasurementTemplateConfig[]>([]);
  const [selectedId, setSelectedId] = useState<MeasurementTemplateId>("gamis");
  const [draft, setDraft] = useState<MeasurementTemplateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchAdminTemplatesApi();
      setTemplates(res.templates);
      const target =
        res.templates.find((t) => t.id === selectedId) ?? res.templates[0] ?? null;
      if (target) {
        setSelectedId(target.id);
        setDraft(cloneTemplateForEdit(target));
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal memuat template ukuran dari server."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectTemplate(template: MeasurementTemplateConfig) {
    setSelectedId(template.id);
    setDraft(cloneTemplateForEdit(template));
    setFeedback(null);
    setErrorMessage(null);
  }

  function handleToggleCategory(catId: GarmentCategoryId) {
    if (!draft) return;
    const exists = draft.supportedCategories.includes(catId);
    const nextCategories = exists
      ? draft.supportedCategories.filter((id) => id !== catId)
      : [...draft.supportedCategories, catId];
    setDraft({
      ...draft,
      supportedCategories: nextCategories,
      defaultCategoryId: nextCategories.includes(draft.defaultCategoryId)
        ? draft.defaultCategoryId
        : (nextCategories[0] ?? draft.defaultCategoryId),
    });
  }

  function handleFieldChange(
    fieldKey: string,
    patch: Partial<MeasurementTemplateField>
  ) {
    if (!draft) return;
    setDraft({
      ...draft,
      fields: draft.fields.map((field) =>
        field.key === fieldKey ? { ...field, ...patch } : field
      ),
    });
  }

  async function handleSaveTemplate() {
    if (!draft) return;
    setSaving(true);
    setFeedback(null);
    setErrorMessage(null);
    try {
      const res = await saveAdminTemplateApi(draft);
      setTemplates(res.templates);
      setDraft(cloneTemplateForEdit(res.template));
      setFeedback(
        `Template "${res.template.name}" tersimpan di Cloudflare D1 dan langsung aktif di Measurement Studio.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal menyimpan perubahan template ukuran."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDefaults() {
    setResetting(true);
    setFeedback(null);
    setErrorMessage(null);
    try {
      const res = await resetAdminTemplatesApi();
      setTemplates(res.templates);
      const target =
        res.templates.find((t) => t.id === selectedId) ?? res.templates[0] ?? null;
      if (target) {
        setDraft(cloneTemplateForEdit(target));
      }
      setConfirmReset(false);
      setFeedback("Seluruh template ukuran telah dikembalikan ke pengaturan bawaan Celmira.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal mengembalikan template ke bawaan."
      );
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="shell py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-cocoa/12 pb-6">
        <div className="max-w-2xl">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
            Konfigurasi Studio · Cloudflare D1
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-espresso sm:text-4xl">
            Template Ukuran &amp; Kategori Busana
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Kelola rentang ukuran (cm), kolom wajib/opsional, status aktif template, serta
            pemetaan kategori busana. Perubahan otomatis disinkronkan ke Measurement Studio
            pelanggan tanpa mengubah snapshot ukuran pesanan lama.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {confirmReset ? (
            <>
              <button
                className="cursor-pointer rounded-full border border-rose/45 bg-rose/15 px-4 py-2 text-xs font-semibold text-espresso hover:bg-rose/25"
                disabled={resetting}
                onClick={() => void handleResetDefaults()}
                type="button"
              >
                {resetting ? "Mereset..." : "Konfirmasi Reset Bawaan"}
              </button>
              <button
                className={buttonClass("outline", "px-4 py-2 text-xs")}
                onClick={() => setConfirmReset(false)}
                type="button"
              >
                Batal
              </button>
            </>
          ) : (
            <button
              className={buttonClass("outline", "px-4 py-2 text-xs")}
              onClick={() => setConfirmReset(true)}
              type="button"
            >
              Reset ke Bawaan
            </button>
          )}
        </div>
      </div>

      {feedback ? (
        <div
          className="mt-6 flex items-center gap-2.5 rounded-2xl border border-cocoa/25 bg-cream/70 px-4 py-3 text-sm text-espresso"
          role="status"
        >
          <CheckIcon className="h-4 w-4 shrink-0 text-cocoa" />
          <span>{feedback}</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className="mt-6 flex items-center gap-2.5 rounded-2xl border border-rose/45 bg-rose/10 px-4 py-3 text-sm text-espresso"
          role="alert"
        >
          <AlertCircleIcon className="h-4 w-4 shrink-0 text-rose" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.45fr)]">
        {/* Daftar 5 Template */}
        <aside className="space-y-3">
          <div className="rounded-[1.5rem] border border-cocoa/15 bg-ivory p-4">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
              Daftar Template ({templates.length})
            </p>
            <div className="mt-3 space-y-2">
              {loading ? (
                <p className="py-6 text-center text-xs text-muted">Memuat template...</p>
              ) : (
                templates.map((template) => {
                  const selected = template.id === selectedId;
                  return (
                    <button
                      className={`w-full cursor-pointer rounded-2xl border p-3.5 text-left transition-all ${
                        selected
                          ? "border-espresso bg-espresso text-ivory"
                          : "border-cocoa/15 bg-cream/35 text-espresso hover:border-cocoa/50"
                      }`}
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{template.shortLabel}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] ${
                            template.active
                              ? selected
                                ? "bg-ivory/20 text-ivory"
                                : "bg-cream text-espresso"
                              : "bg-rose/20 text-rose"
                          }`}
                        >
                          {template.active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <p
                        className={`mt-1 text-xs ${
                          selected ? "text-ivory/80" : "text-muted"
                        }`}
                      >
                        {template.fields.length} titik ukur · {template.supportedCategories.length}{" "}
                        kategori
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Ringkasan 8 Kategori Layanan */}
          <div className="rounded-[1.5rem] border border-cocoa/15 bg-cream/35 p-4">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
              8 Kategori Layanan Celmira
            </p>
            <ul className="mt-3 space-y-2">
              {garmentCategories.map((cat) => {
                const supporting = templates
                  .filter((t) => t.active && t.supportedCategories.includes(cat.id))
                  .map((t) => t.shortLabel);
                return (
                  <li
                    className="rounded-xl border border-cocoa/10 bg-ivory px-3 py-2 text-xs"
                    key={cat.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-espresso">
                        {cat.index}. {cat.name}
                      </strong>
                      <span className="text-[0.6875rem] text-muted">
                        {supporting.length > 0 ? supporting.join(", ") : "Belum dipetakan"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Editor Template Terpilih */}
        <section className="rounded-[1.5rem] border border-cocoa/15 bg-cream/30 p-5 sm:p-6">
          {!draft ? (
            <p className="py-12 text-center text-sm text-muted">Pilih template untuk diedit.</p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cocoa/12 pb-4">
                <div className="flex items-center gap-2.5">
                  <SlidersIcon className="h-5 w-5 text-cocoa" />
                  <div>
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                      ID Template: {draft.id}
                    </p>
                    <h3 className="font-[family-name:var(--font-display)] text-2xl text-espresso">
                      {draft.name}
                    </h3>
                  </div>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-cocoa/20 bg-ivory px-3.5 py-1.5 text-xs font-medium text-espresso">
                  <input
                    checked={draft.active}
                    className="h-4 w-4 accent-espresso"
                    onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                    type="checkbox"
                  />
                  Template Aktif
                </label>
              </div>

              {/* Informasi Dasar Template */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-espresso">Nama Template</span>
                  <input
                    className={`mt-1.5 ${inputClass}`}
                    maxLength={80}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    type="text"
                    value={draft.name}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-espresso">Label Singkat</span>
                  <input
                    className={`mt-1.5 ${inputClass}`}
                    maxLength={32}
                    onChange={(e) => setDraft({ ...draft, shortLabel: e.target.value })}
                    type="text"
                    value={draft.shortLabel}
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-espresso">Tagline</span>
                <input
                  className={`mt-1.5 ${inputClass}`}
                  maxLength={140}
                  onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
                  type="text"
                  value={draft.tagline}
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-espresso">Deskripsi Panduan</span>
                <textarea
                  className={`mt-1.5 ${inputClass}`}
                  maxLength={400}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={2}
                  value={draft.description}
                />
              </label>

              {/* Pemetaan Kategori Busana */}
              <div className="rounded-2xl border border-cocoa/12 bg-ivory p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa">
                  Kategori Busana Didukung
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {garmentCategories.map((cat) => {
                    const checked = draft.supportedCategories.includes(cat.id);
                    return (
                      <label
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          checked
                            ? "border-espresso bg-espresso text-ivory"
                            : "border-cocoa/20 bg-cream/35 text-espresso hover:border-cocoa"
                        }`}
                        key={cat.id}
                      >
                        <input
                          checked={checked}
                          className="sr-only"
                          onChange={() => handleToggleCategory(cat.id)}
                          type="checkbox"
                        />
                        <span>{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Editor Kolom Ukuran (cm) */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa">
                  Titik Pengukuran &amp; Batas Validasi (cm)
                </p>
                <div className="mt-3 space-y-3">
                  {draft.fields.map((field) => (
                    <div
                      className="rounded-2xl border border-cocoa/15 bg-ivory p-4"
                      key={field.key}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[0.6875rem] text-muted">{field.key}</span>
                          <span className="rounded-full bg-cream px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-cocoa">
                            {field.storageTarget}
                          </span>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-espresso">
                          <input
                            checked={field.required}
                            className="h-3.5 w-3.5 accent-espresso"
                            onChange={(e) =>
                              handleFieldChange(field.key, { required: e.target.checked })
                            }
                            type="checkbox"
                          />
                          Wajib diisi
                        </label>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-[0.6875rem] text-muted">Label Tampilan</span>
                          <input
                            className={`mt-1 ${inputClass}`}
                            onChange={(e) =>
                              handleFieldChange(field.key, { label: e.target.value })
                            }
                            type="text"
                            value={field.label}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[0.6875rem] text-muted">Tip Singkat</span>
                          <input
                            className={`mt-1 ${inputClass}`}
                            onChange={(e) =>
                              handleFieldChange(field.key, { tip: e.target.value })
                            }
                            type="text"
                            value={field.tip}
                          />
                        </label>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        <label className="block">
                          <span className="text-[0.6875rem] text-muted">Min (cm)</span>
                          <input
                            className={`mt-1 ${inputClass}`}
                            onChange={(e) =>
                              handleFieldChange(field.key, { min: Number(e.target.value) })
                            }
                            step="0.5"
                            type="number"
                            value={field.min}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[0.6875rem] text-muted">Max (cm)</span>
                          <input
                            className={`mt-1 ${inputClass}`}
                            onChange={(e) =>
                              handleFieldChange(field.key, { max: Number(e.target.value) })
                            }
                            step="0.5"
                            type="number"
                            value={field.max}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[0.6875rem] text-muted">Default (cm)</span>
                          <input
                            className={`mt-1 ${inputClass}`}
                            onChange={(e) =>
                              handleFieldChange(field.key, {
                                defaultValue: Number(e.target.value),
                              })
                            }
                            step="0.5"
                            type="number"
                            value={field.defaultValue}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[0.6875rem] text-muted">Step (cm)</span>
                          <input
                            className={`mt-1 ${inputClass}`}
                            onChange={(e) =>
                              handleFieldChange(field.key, { step: Number(e.target.value) })
                            }
                            step="0.5"
                            type="number"
                            value={field.step}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cocoa/12 pt-4">
                <p className="text-xs text-muted">
                  Pembaruan terakhir: {formatDateTimeId(draft.updatedAt)}
                </p>
                <button
                  className={buttonClass("solid", "px-5 py-2.5 text-xs")}
                  disabled={saving}
                  onClick={() => void handleSaveTemplate()}
                  type="button"
                >
                  {saving ? "Menyimpan..." : "Simpan Template ke Server"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

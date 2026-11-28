"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BookingStepper } from "@/components/orders/BookingStepper";
import { BookingSummarySidebar } from "@/components/orders/BookingSummarySidebar";
import { OrderConfirmationView } from "@/components/orders/OrderConfirmationView";
import { StepCategoryDesign } from "@/components/orders/StepCategoryDesign";
import {
  StepCustomerDelivery,
  type PublicProductionScheduleInfo,
} from "@/components/orders/StepCustomerDelivery";
import { StepGarmentDetails } from "@/components/orders/StepGarmentDetails";
import { StepMeasurements } from "@/components/orders/StepMeasurements";
import { StepOrderReview } from "@/components/orders/StepOrderReview";
import { buttonClass } from "@/components/ui/ButtonLink";
import { ArrowLeft, ArrowRight } from "@/components/ui/icons";
import {
  celmiraDesignReferences,
  createInitialOrderDraft,
  getCategoryById,
} from "@/lib/booking-options";
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateStep5,
} from "@/lib/booking-validation";
import { OrdersApiError, fetchCustomerOrdersApi, submitOrderApi } from "@/lib/orders-client";
import { fetchMeasurementProfilesApi, fetchSavedDesignsApi } from "@/lib/studio-client";
import {
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
  saveSubmittedOrder,
} from "@/lib/storage/tailor-store";
import type {
  CelmiraDesignReference,
  CustomerIdentity,
  DeliveryDetails,
  DesignSourceType,
  DesignStudioSavedConfig,
  GarmentCategoryId,
  GarmentSpecifications,
  MeasurementInputMode,
  MeasurementProfile,
  MeasurementValues,
  OrderDraft,
  ReferenceAttachment,
  SubmittedOrder,
} from "@/lib/types/tailor";

export function CustomerBookingFlow() {
  const searchParams = useSearchParams();

  const [draft, setDraft] = useState<OrderDraft>(createInitialOrderDraft);
  const [hydrated, setHydrated] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [highestUnlockedStep, setHighestUnlockedStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedDesigns, setSavedDesigns] = useState<DesignStudioSavedConfig[]>([]);
  const [measurementProfiles, setMeasurementProfiles] = useState<MeasurementProfile[]>([]);
  const [productionSchedule, setProductionSchedule] =
    useState<PublicProductionScheduleInfo | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const storedDraft = loadBookingDraft();
      let designs: DesignStudioSavedConfig[] = [];
      let profiles: MeasurementProfile[] = [];
      let sessionContact: { fullName: string; whatsapp: string; email: string } | null = null;

      try {
        const [designsRes, profilesRes, ordersRes, scheduleRes] = await Promise.all([
          fetchSavedDesignsApi(),
          fetchMeasurementProfilesApi(),
          fetchCustomerOrdersApi().catch(() => ({ orders: [], customerContact: null })),
          fetch("/api/site/production-schedule", { cache: "no-store" })
            .then((r) => (r.ok ? (r.json() as Promise<PublicProductionScheduleInfo>) : null))
            .catch(() => null),
        ]);
        if (!active) return;
        designs = designsRes.designs;
        profiles = profilesRes.profiles;
        sessionContact = ordersRes.customerContact;
        if (scheduleRes) {
          setProductionSchedule(scheduleRes);
        }
      } catch {
        // Bila gagal memuat sementara, pengguna tetap dapat memilih desain Celmira / ukuran manual
      }

      if (!active) return;

      const urlParams =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const getParam = (key: string) => searchParams.get(key) ?? urlParams?.get(key) ?? null;

      const categoryParam = getParam("category") as GarmentCategoryId | null;
      const celmiraDesignParam = getParam("celmiraDesignId");
      const designParam = getParam("designId");
      const measurementParam = getParam("measurementId");

      let nextDraft = storedDraft;

      if (categoryParam && getCategoryById(categoryParam)) {
        nextDraft = {
          ...nextDraft,
          categoryId: categoryParam,
        };
      }

      if (celmiraDesignParam) {
        const celmiraDesign = celmiraDesignReferences.find(
          (item) => item.id === celmiraDesignParam
        );
        if (celmiraDesign) {
          nextDraft = {
            ...nextDraft,
            categoryId: celmiraDesign.categoryId,
            designSource: "celmira",
            selectedCelmiraDesignId: celmiraDesign.id,
            specifications: {
              ...nextDraft.specifications,
              ...celmiraDesign.defaults,
            },
          };
        }
      }

      if (designParam) {
        const studioDesign = designs.find((item) => item.id === designParam);
        if (studioDesign) {
          nextDraft = {
            ...nextDraft,
            categoryId: studioDesign.categoryId,
            designSource: "design-studio",
            selectedStudioDesignId: studioDesign.id,
            specifications: { ...studioDesign.specifications },
            attachments: studioDesign.attachments.map((att) => ({ ...att })),
          };
        }
      }

      if (measurementParam) {
        const profile = profiles.find((item) => item.id === measurementParam);
        if (profile) {
          const hasExistingDesignChoice =
            Boolean(nextDraft.selectedCelmiraDesignId) ||
            Boolean(nextDraft.selectedStudioDesignId) ||
            nextDraft.attachments.length > 0;
          const resolvedCategoryId =
            (!hasExistingDesignChoice && profile.categoryHint) ||
            nextDraft.categoryId ||
            profile.categoryHint ||
            "";

          nextDraft = {
            ...nextDraft,
            categoryId: resolvedCategoryId,
            measurements: {
              ...nextDraft.measurements,
              mode: "profile",
              profileId: profile.id,
              profileName: profile.label,
              templateId: profile.templateId,
              values: { ...profile.values },
              extraValues: profile.extraValues ? { ...profile.extraValues } : undefined,
              fitPreferenceNote:
                nextDraft.measurements.fitPreferenceNote || profile.notes || "",
            },
          };
        }
      }

      if (sessionContact) {
        nextDraft = {
          ...nextDraft,
          customer: {
            fullName: nextDraft.customer.fullName || sessionContact.fullName,
            whatsapp: nextDraft.customer.whatsapp || sessionContact.whatsapp,
            email: nextDraft.customer.email || sessionContact.email,
          },
        };
      }

      setSavedDesigns(designs);
      setMeasurementProfiles(profiles);
      setDraft(nextDraft);
      setHydrated(true);
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!hydrated || submittedOrder) return;
    saveBookingDraft(draft);
  }, [draft, hydrated, submittedOrder]);

  function validateForStep(step: number, candidate: OrderDraft) {
    switch (step) {
      case 1:
        return validateStep1(candidate);
      case 2:
        return validateStep2(candidate);
      case 3:
        return validateStep3(candidate);
      case 4: {
        const base = validateStep4(candidate);
        const blocked = productionSchedule?.blockedDates.find(
          (item) => item.date === candidate.targetDate
        );
        if (blocked) {
          return {
            valid: false,
            errors: {
              ...base.errors,
              targetDate: `Tanggal ${blocked.date} tidak tersedia (${blocked.reason}). Pilih tanggal target lain.`,
            },
          };
        }
        return base;
      }
      case 5:
        return validateStep5(candidate);
      default:
        return { valid: true, errors: {} };
    }
  }

  function handleNext() {
    const result = validateForStep(currentStep, draft);
    if (!result.valid) {
      setErrors(result.errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErrors({});
    if (currentStep < 5) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setHighestUnlockedStep((prev) => Math.max(prev, next));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    setErrors({});
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    const result = validateStep5(draft);
    if (!result.valid) {
      setErrors(result.errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const matchedStudio =
        draft.designSource === "design-studio"
          ? savedDesigns.find((item) => item.id === draft.selectedStudioDesignId)
          : undefined;
      const { order: created } = await submitOrderApi(draft, matchedStudio?.title);
      saveSubmittedOrder(created);
      clearBookingDraft();
      setErrors({});
      setSubmittedOrder(created);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof OrdersApiError && err.errors) {
        setErrors(err.errors);
      }
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Gagal mengirim pesanan ke server. Silakan coba lagi."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleResetNewOrder() {
    clearBookingDraft();
    setDraft(createInitialOrderDraft());
    setSubmittedOrder(null);
    setCurrentStep(1);
    setHighestUnlockedStep(1);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSelectCategory(categoryId: GarmentCategoryId) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next.categoryId;
      return next;
    });

    setDraft((prev) => {
      const matchingRef = celmiraDesignReferences.find((item) => item.categoryId === categoryId);
      const shouldAutoPick =
        prev.designSource === "celmira" &&
        (!prev.selectedCelmiraDesignId ||
          celmiraDesignReferences.find((d) => d.id === prev.selectedCelmiraDesignId)
            ?.categoryId !== categoryId);

      if (shouldAutoPick && matchingRef) {
        return {
          ...prev,
          categoryId,
          selectedCelmiraDesignId: matchingRef.id,
          specifications: {
            ...prev.specifications,
            fabric: matchingRef.defaults.fabric,
            colorName: matchingRef.defaults.colorName,
            colorHex: matchingRef.defaults.colorHex,
            sleeveStyle: matchingRef.defaults.sleeveStyle,
            collarStyle: matchingRef.defaults.collarStyle,
            lengthOption: matchingRef.defaults.lengthOption,
          },
        };
      }

      return { ...prev, categoryId };
    });
  }

  function handleSelectCelmiraDesign(design: CelmiraDesignReference) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next.design;
      return next;
    });

    setDraft((prev) => ({
      ...prev,
      categoryId: prev.categoryId || design.categoryId,
      selectedCelmiraDesignId: design.id,
      specifications: {
        ...prev.specifications,
        fabric: design.defaults.fabric,
        colorName: design.defaults.colorName,
        colorHex: design.defaults.colorHex,
        sleeveStyle: design.defaults.sleeveStyle,
        collarStyle: design.defaults.collarStyle,
        lengthOption: design.defaults.lengthOption,
      },
    }));
  }

  function handleSelectStudioDesign(design: DesignStudioSavedConfig) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next.design;
      return next;
    });

    setDraft((prev) => ({
      ...prev,
      categoryId: design.categoryId,
      selectedStudioDesignId: design.id,
      specifications: { ...design.specifications },
      attachments: design.attachments.map((att) => ({ ...att })),
    }));
  }

  if (submittedOrder) {
    return (
      <div className="shell py-14 sm:py-20">
        <OrderConfirmationView onCreateAnother={handleResetNewOrder} order={submittedOrder} />
      </div>
    );
  }

  return (
    <div>
      <section className="shell pb-10 pt-12 sm:pt-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <p className="eyebrow">Pemesanan Custom</p>
            <h1 className="text-balance text-[2.2rem] leading-[1.1] text-espresso sm:text-[2.9rem]">
              Ajukan pesanan jahit Anda.
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-[0.95rem]">
              Susun kebutuhan busana Anda langkah demi langkah. Draft tersimpan otomatis di browser
              perangkat ini sehingga Anda dapat melanjutkannya kapan saja.
            </p>
          </div>
          <button
            className="w-fit text-xs font-medium uppercase tracking-[0.14em] text-muted underline underline-offset-4 transition-colors hover:text-espresso"
            onClick={handleResetNewOrder}
            type="button"
          >
            Mulai ulang draft
          </button>
        </div>
      </section>

      <BookingStepper
        currentStep={currentStep}
        highestUnlockedStep={highestUnlockedStep}
        onSelectStep={(step) => {
          setErrors({});
          setCurrentStep(step);
        }}
      />

      <div className="shell py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
          <div>
            {currentStep === 1 ? (
              <StepCategoryDesign
                draft={draft}
                errors={errors}
                onAddAttachments={(files: ReferenceAttachment[]) => {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.attachments;
                    return next;
                  });
                  setDraft((prev) => ({
                    ...prev,
                    attachments: [...prev.attachments, ...files],
                  }));
                }}
                onChangeDesignSource={(designSource: DesignSourceType) => {
                  setErrors({});
                  setDraft((prev) => ({ ...prev, designSource }));
                }}
                onRemoveAttachment={(id) =>
                  setDraft((prev) => ({
                    ...prev,
                    attachments: prev.attachments.filter((item) => item.id !== id),
                  }))
                }
                onSelectCategory={handleSelectCategory}
                onSelectCelmiraDesign={handleSelectCelmiraDesign}
                onSelectStudioDesign={handleSelectStudioDesign}
                onUpdateAttachmentNote={(id, note) =>
                  setDraft((prev) => ({
                    ...prev,
                    attachments: prev.attachments.map((item) =>
                      item.id === id ? { ...item, note } : item
                    ),
                  }))
                }
                onUpdateCustomTitle={(customDesignTitle) =>
                  setDraft((prev) => ({ ...prev, customDesignTitle }))
                }
                savedDesigns={savedDesigns}
              />
            ) : null}

            {currentStep === 2 ? (
              <StepGarmentDetails
                errors={errors}
                onChange={(patch: Partial<GarmentSpecifications>) =>
                  setDraft((prev) => ({
                    ...prev,
                    specifications: { ...prev.specifications, ...patch },
                  }))
                }
                specifications={draft.specifications}
              />
            ) : null}

            {currentStep === 3 ? (
              <StepMeasurements
                categoryId={draft.categoryId}
                errors={errors}
                measurements={draft.measurements}
                onChangeFitNote={(fitPreferenceNote) =>
                  setDraft((prev) => ({
                    ...prev,
                    measurements: { ...prev.measurements, fitPreferenceNote },
                  }))
                }
                onChangeMode={(mode: MeasurementInputMode) => {
                  setErrors({});
                  setDraft((prev) => ({
                    ...prev,
                    measurements: { ...prev.measurements, mode },
                  }));
                }}
                onChangeSampleNote={(sampleGarmentNote) =>
                  setDraft((prev) => ({
                    ...prev,
                    measurements: { ...prev.measurements, sampleGarmentNote },
                  }))
                }
                onChangeValue={(key: keyof MeasurementValues, value: string) =>
                  setDraft((prev) => ({
                    ...prev,
                    measurements: {
                      ...prev.measurements,
                      values: { ...prev.measurements.values, [key]: value },
                    },
                  }))
                }
                onSelectProfile={(profile) => {
                  setErrors({});
                  setDraft((prev) => ({
                    ...prev,
                    measurements: {
                      ...prev.measurements,
                      mode: "profile",
                      profileId: profile.id,
                      profileName: profile.label,
                      templateId: profile.templateId,
                      values: { ...profile.values },
                      extraValues: profile.extraValues ? { ...profile.extraValues } : undefined,
                      fitPreferenceNote:
                        prev.measurements.fitPreferenceNote || profile.notes || "",
                    },
                  }));
                }}
                profiles={measurementProfiles}
              />
            ) : null}

            {currentStep === 4 ? (
              <StepCustomerDelivery
                categoryId={draft.categoryId}
                customer={draft.customer}
                delivery={draft.delivery}
                errors={errors}
                onChangeCustomer={(patch: Partial<CustomerIdentity>) =>
                  setDraft((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, ...patch },
                  }))
                }
                onChangeDelivery={(patch: Partial<DeliveryDetails>) =>
                  setDraft((prev) => ({
                    ...prev,
                    delivery: { ...prev.delivery, ...patch },
                  }))
                }
                onChangeTargetDate={(targetDate) => setDraft((prev) => ({ ...prev, targetDate }))}
                productionSchedule={productionSchedule}
                targetDate={draft.targetDate}
              />
            ) : null}

            {currentStep === 5 ? (
              <StepOrderReview
                draft={draft}
                errors={errors}
                onJumpToStep={(step) => {
                  setErrors({});
                  setCurrentStep(step);
                }}
                onToggleAgreed={(agreedToTerms) =>
                  setDraft((prev) => ({ ...prev, agreedToTerms }))
                }
                savedDesigns={savedDesigns}
              />
            ) : null}

            {submitError ? (
              <div className="mt-6 rounded-2xl border border-red-800/20 bg-red-50 px-4 py-3 text-xs font-medium text-red-900">
                {submitError}
              </div>
            ) : null}

            {/* Navigasi Bawah */}
            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-cocoa/12 pt-6 sm:flex-row sm:items-center sm:justify-between">
              {currentStep > 1 ? (
                <button
                  className={buttonClass("outline")}
                  disabled={isSubmitting}
                  onClick={handleBack}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </button>
              ) : (
                <div />
              )}

              {currentStep < 5 ? (
                <button className={buttonClass("solid")} onClick={handleNext} type="button">
                  Lanjut ke Langkah {currentStep + 1}
                  <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                </button>
              ) : (
                <button
                  className={buttonClass("solid")}
                  disabled={isSubmitting}
                  onClick={() => void handleSubmit()}
                  type="button"
                >
                  {isSubmitting ? "Mengirim Pesanan..." : "Ajukan Pesanan Custom"}
                  <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                </button>
              )}
            </div>
          </div>

          <BookingSummarySidebar draft={draft} savedDesigns={savedDesigns} />
        </div>
      </div>
    </div>
  );
}

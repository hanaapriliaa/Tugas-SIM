"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BookingStepper } from "@/components/orders/BookingStepper";
import { BookingSummarySidebar } from "@/components/orders/BookingSummarySidebar";
import { OrderConfirmationView } from "@/components/orders/OrderConfirmationView";
import { StepCategoryDesign } from "@/components/orders/StepCategoryDesign";
import { StepCustomerDelivery } from "@/components/orders/StepCustomerDelivery";
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
import {
  clearBookingDraft,
  createSubmittedOrderFromDraft,
  loadBookingDraft,
  loadMeasurementProfiles,
  loadSavedDesigns,
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
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(null);

  useEffect(() => {
    const storedDraft = loadBookingDraft();
    const designs = loadSavedDesigns();
    const profiles = loadMeasurementProfiles();

    const categoryParam = searchParams.get("category") as GarmentCategoryId | null;
    const celmiraDesignParam = searchParams.get("celmiraDesignId");
    const designParam = searchParams.get("designId");
    const measurementParam = searchParams.get("measurementId");

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
        };
      }
    }

    if (measurementParam) {
      const profile = profiles.find((item) => item.id === measurementParam);
      if (profile) {
        nextDraft = {
          ...nextDraft,
          measurements: {
            ...nextDraft.measurements,
            mode: "profile",
            profileId: profile.id,
            profileName: profile.label,
            values: { ...profile.values },
          },
        };
      }
    }

    setSavedDesigns(designs);
    setMeasurementProfiles(profiles);
    setDraft(nextDraft);
    setHydrated(true);
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
      case 4:
        return validateStep4(candidate);
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

  function handleSubmit() {
    const result = validateStep5(draft);
    if (!result.valid) {
      setErrors(result.errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const created = createSubmittedOrderFromDraft(draft);
    saveSubmittedOrder(created);
    clearBookingDraft();
    setErrors({});
    setSubmittedOrder(created);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
                onSelectProfile={(profile) =>
                  setDraft((prev) => ({
                    ...prev,
                    measurements: {
                      ...prev.measurements,
                      profileId: profile.id,
                      profileName: profile.label,
                      values: { ...profile.values },
                    },
                  }))
                }
                profiles={measurementProfiles}
              />
            ) : null}

            {currentStep === 4 ? (
              <StepCustomerDelivery
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

            {/* Navigasi Bawah */}
            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-cocoa/12 pt-6 sm:flex-row sm:items-center sm:justify-between">
              {currentStep > 1 ? (
                <button className={buttonClass("outline")} onClick={handleBack} type="button">
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
                <button className={buttonClass("solid")} onClick={handleSubmit} type="button">
                  Ajukan Pesanan Custom
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

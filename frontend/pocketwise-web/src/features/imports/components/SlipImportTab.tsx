"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  Check,
  CheckCheck,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Receipt,
  Image as ImageIcon,
  Maximize2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Tag as TagIcon,
  Pencil,
  Plus,
  Trash2,
  Layers,
  SkipForward,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { FormField } from "@/components/ui/form-field";
import { DateTimeInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBankAccounts } from "@/features/accounts/hooks/useBankAccounts";
import { findMatchingBankAccount } from "@/lib/bank-matcher";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { apiClient } from "@/lib/api-client";
import { useTags } from "@/features/tags/hooks/useTags";
import { useCategorySuggestion } from "@/features/categorization/hooks/useCategorization";
import {
  useConfirmSlip,
  useRejectSlip,
} from "@/features/imports/hooks/useImports";
import type { SlipImportResponse } from "@/types/import.types";
import { toast } from "sonner";
import { formatDisplayDateTime } from "@/lib/date-utils";
import { cn, getReadableTextColor, toThailandDateTimeInputValue, thailandDateTimeInputToUtcIso } from "@/lib/utils";

function recordCategoryUsage(categoryId: number | null | undefined) {
  if (!categoryId) return;
  try {
    const raw = localStorage.getItem("pocketwise_frequent_categories");
    const map: Record<number, number> = raw ? JSON.parse(raw) : {};
    map[categoryId] = (map[categoryId] || 0) + 1;
    localStorage.setItem("pocketwise_frequent_categories", JSON.stringify(map));
  } catch {}
}

export type BatchItemStatus = "uploading" | "ready" | "confirmed" | "rejected" | "error";

export interface BatchSlipItem {
  id: string;
  file: File;
  previewUrl: string;
  status: BatchItemStatus;
  errorMessage?: string;
  slipData?: SlipImportResponse;

  // Form values specific to this slip
  amount: string;
  transactionDate: string;
  description: string;
  payeeName: string;
  bankAccountId: string;
  creditCardId: string;
  categoryId: string;
  selectedTagIds: number[];
  isCustomDateTime?: boolean;
}

export function SlipImportTab() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);

  // Batch Queue State
  const [batchItems, setBatchItems] = useState<BatchSlipItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);

  // UX States
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showTagsSection, setShowTagsSection] = useState(false);
  const [showDetectedPills, setShowDetectedPills] = useState(false);

  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const confirmMutation = useConfirmSlip();
  const rejectMutation = useRejectSlip();

  // Active slip in carousel
  const currentItem = batchItems[currentIndex] as BatchSlipItem | undefined;

  const [debouncedDescription, setDebouncedDescription] = useState("");
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedDescription(currentItem?.description ?? "");
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [currentItem?.description]);

  const { data: categorySuggestion } = useCategorySuggestion(
    debouncedDescription,
    Boolean(debouncedDescription && debouncedDescription.trim().length >= 2),
  );

  // Update a field on the currently active slip
  const updateCurrentItem = (updates: Partial<BatchSlipItem>) => {
    setBatchItems((prev) =>
      prev.map((item, idx) => (idx === currentIndex ? { ...item, ...updates } : item))
    );
  };

  // SignalR real-time OCR completion handler
  useEffect(() => {
    const handleSlipUploaded = async (e: Event) => {
      const customEvent = e as CustomEvent<{ relatedEntityType?: string; relatedEntityId?: number | string }>;
      const slipId = customEvent.detail?.relatedEntityId;
      if (!slipId) return;

      try {
        const res = await apiClient.get<SlipImportResponse>(`/api/v1/imports/slips/${slipId}`);
        if (res) {
          setBatchItems((prev) =>
            prev.map((it) => {
              if (it.slipData?.slipImportFileId === res.slipImportFileId) {
                return {
                  ...it,
                  slipData: res,
                  status: res.reviewStatus === "confirmed" ? "confirmed" : res.reviewStatus === "rejected" ? "rejected" : it.status,
                };
              }
              return it;
            })
          );
        }
      } catch {}
    };

    window.addEventListener("pocketwise:slip_uploaded", handleSlipUploaded);
    return () => {
      window.removeEventListener("pocketwise:slip_uploaded", handleSlipUploaded);
    };
  }, []);

  async function prepareSlipFile(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) {
      return file;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxDim = 1600;
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && file.size <= 400 * 1024) {
          resolve(file);
          return;
        }

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  // Handle batch file addition and background processing
  const handleProcessFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.name.match(/\.(jpe?g|png|webp|pdf)$/i)
    );
    if (fileArray.length === 0) {
      toast.error("กรุณาเลือกไฟล์รูปภาพสลิปที่ถูกต้อง (JPEG, PNG, WEBP หรือ PDF)");
      return;
    }

    const previousLength = batchItems.length;
    const newItems: BatchSlipItem[] = fileArray.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
      amount: "",
      transactionDate: toThailandDateTimeInputValue(new Date()),
      description: "",
      payeeName: "",
      bankAccountId: "",
      creditCardId: "",
      categoryId: "",
      selectedTagIds: [],
      isCustomDateTime: false,
    }));

    setBatchItems((prev) => [...prev, ...newItems]);
    if (previousLength === 0) {
      setCurrentIndex(0);
    }

    toast.info(`กำลังอ่านข้อมูลสลิป ${newItems.length} ใบด้วย AI...`);

    // Process uploads concurrently
    for (const item of newItems) {
      (async () => {
        try {
          const processedFile = await prepareSlipFile(item.file);
          const formData = new FormData();
          formData.append("file", processedFile);

          const res = await apiClient.post<SlipImportResponse>("/api/v1/imports/slips", formData);
          if (res) {
            const matched = findMatchingBankAccount(res.bankCode, bankAccounts);
            const lastBankId =
              typeof window !== "undefined" ? localStorage.getItem("pocketwise_last_bank_account_id") : null;
            const initialBankId = matched ? String(matched.bankAccountId) : lastBankId || "";

            let initialDate = toThailandDateTimeInputValue(new Date());
            if (res.detectedAt) {
              try {
                initialDate = toThailandDateTimeInputValue(res.detectedAt);
              } catch {}
            }

            let initialDesc = "";
            if (res.payeeName) {
              initialDesc = `โอนเงินให้ ${res.payeeName}`;
            } else if (res.payerName) {
              initialDesc = `รับเงินจาก ${res.payerName}`;
            }

            setBatchItems((prev) =>
              prev.map((it) =>
                it.id === item.id
                  ? {
                      ...it,
                      status: "ready",
                      slipData: res,
                      amount: res.detectedAmount ? String(res.detectedAmount) : "",
                      transactionDate: initialDate,
                      payeeName: res.payeeName ?? "",
                      description: initialDesc,
                      categoryId: res.suggestedCategoryId ? String(res.suggestedCategoryId) : "",
                      bankAccountId: initialBankId,
                    }
                  : it
              )
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอ่านสลิป";
          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: "error",
                    errorMessage: msg,
                  }
                : it
            )
          );
        }
      })();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleProcessFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (appendFileInputRef.current) appendFileInputRef.current.value = "";
  };

  // Top active categories filtered by expense / both
  const availableCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter((c) => c.isActive && (c.categoryType === "both" || c.categoryType === "expense"));
  }, [categories]);

  // Dynamic quick category chips (Prioritize user's most used categories)
  const quickCategories = useMemo(() => {
    if (!availableCategories || availableCategories.length === 0) return [];

    let frequencyMap: Record<number, number> = {};
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("pocketwise_frequent_categories") : null;
      if (raw) frequencyMap = JSON.parse(raw);
    } catch {}

    const sorted = [...availableCategories].sort((a, b) => {
      const countA = frequencyMap[a.categoryId] || 0;
      const countB = frequencyMap[b.categoryId] || 0;
      if (countA !== countB) {
        return countB - countA;
      }
      return a.sortOrder - b.sortOrder;
    });

    return sorted.slice(0, 6);
  }, [availableCategories]);

  // Selected category if outside the top 6
  const currentCategoryId = currentItem?.categoryId;
  const outsideSelectedCategory = useMemo(() => {
    if (!currentCategoryId || currentCategoryId === "none") return null;
    if (quickCategories.some((c) => String(c.categoryId) === currentCategoryId)) return null;
    return availableCategories.find((c) => String(c.categoryId) === currentCategoryId) ?? null;
  }, [availableCategories, quickCategories, currentCategoryId]);

  // Format date summary for progressive disclosure
  const currentTransactionDate = currentItem?.transactionDate;
  const displayDateSummary = useMemo(() => {
    if (!currentTransactionDate) return "เวลาปัจจุบัน";
    try {
      return formatDisplayDateTime(currentTransactionDate);
    } catch {
      return "เวลาปัจจุบัน";
    }
  }, [currentTransactionDate]);

  const handleSelectCategory = (catId: number | null) => {
    const val = catId == null ? "" : String(catId);
    updateCurrentItem({ categoryId: val });
    if (catId) {
      recordCategoryUsage(catId);
    }
  };

  // Matched bank account for current item
  const currentBankCode = currentItem?.slipData?.bankCode;
  const matchedAccount = useMemo(() => {
    if (!currentBankCode) return null;
    return findMatchingBankAccount(currentBankCode, bankAccounts);
  }, [currentBankCode, bankAccounts]);

  // Batch stats summary
  const batchStats = useMemo(() => {
    const total = batchItems.length;
    const uploading = batchItems.filter((i) => i.status === "uploading").length;
    const ready = batchItems.filter((i) => i.status === "ready").length;
    const confirmed = batchItems.filter((i) => i.status === "confirmed").length;
    const error = batchItems.filter((i) => i.status === "error").length;
    return { total, uploading, ready, confirmed, error };
  }, [batchItems]);

  // Confirm Single Slip and Advance
  const handleConfirmCurrent = async () => {
    if (!currentItem || !currentItem.slipData) return;
    const numAmount = parseFloat(currentItem.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("กรุณาระบุจำนวนเงินให้ถูกต้อง");
      return;
    }

    let isoDate = new Date().toISOString();
    if (currentItem.transactionDate) {
      try {
        isoDate = thailandDateTimeInputToUtcIso(currentItem.transactionDate);
      } catch {
        isoDate = new Date(currentItem.transactionDate).toISOString();
      }
    }

    setIsActionLoading(true);
    try {
      await confirmMutation.mutateAsync({
        slipImportFileId: currentItem.slipData.slipImportFileId,
        body: {
          amount: numAmount,
          transactionDate: isoDate,
          description:
            currentItem.description.trim() ||
            (currentItem.payeeName.trim()
              ? `โอนเงินให้ ${currentItem.payeeName.trim()}`
              : "โอนเงินผ่านสลิป"),
          categoryId:
            currentItem.categoryId && currentItem.categoryId !== "none"
              ? Number(currentItem.categoryId)
              : null,
          bankAccountId:
            currentItem.bankAccountId && currentItem.bankAccountId !== "none"
              ? Number(currentItem.bankAccountId)
              : null,
          creditCardId:
            currentItem.creditCardId && currentItem.creditCardId !== "none"
              ? Number(currentItem.creditCardId)
              : null,
          payeeName: currentItem.payeeName.trim() || currentItem.slipData.payeeName,
          payerName: currentItem.slipData.payerName,
          transactionReference: currentItem.slipData.transactionReference,
          tagIds: currentItem.selectedTagIds,
        },
      });

      if (currentItem.bankAccountId && currentItem.bankAccountId !== "none") {
        try {
          localStorage.setItem("pocketwise_last_bank_account_id", currentItem.bankAccountId);
        } catch {}
      }
      if (currentItem.categoryId && currentItem.categoryId !== "none") {
        recordCategoryUsage(Number(currentItem.categoryId));
      }

      toast.success(`บันทึกสลิปใบที่ ${currentIndex + 1} เรียบร้อยแล้ว`);

      // Update state for current item
      setBatchItems((prev) =>
        prev.map((it, idx) => (idx === currentIndex ? { ...it, status: "confirmed" } : it))
      );

      // Auto advance to next ready slip if available, or next slip
      const nextReadyIdx = batchItems.findIndex((it, idx) => idx > currentIndex && it.status === "ready");
      if (nextReadyIdx !== -1) {
        setCurrentIndex(nextReadyIdx);
      } else if (currentIndex < batchItems.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกรายการ";
      toast.error(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Skip Current Slip
  const handleSkipCurrent = () => {
    if (currentIndex < batchItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      const firstReady = batchItems.findIndex((it) => it.status === "ready");
      if (firstReady !== -1 && firstReady !== currentIndex) {
        setCurrentIndex(firstReady);
      } else {
        toast.info("อยู่ที่สลิปใบสุดท้ายในคิวแล้ว");
      }
    }
  };

  // Remove or Reject Current Slip
  const handleRemoveOrRejectCurrent = async () => {
    if (!currentItem) return;

    if (currentItem.slipData) {
      try {
        await rejectMutation.mutateAsync(currentItem.slipData.slipImportFileId);
        toast.info(`ปฏิเสธสลิปใบที่ ${currentIndex + 1} เรียบร้อยแล้ว`);
      } catch {}
    }

    if (currentItem.previewUrl) {
      try {
        URL.revokeObjectURL(currentItem.previewUrl);
      } catch {}
    }

    setBatchItems((prev) => {
      const next = prev.filter((it) => it.id !== currentItem.id);
      if (currentIndex >= next.length) {
        setCurrentIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  // Confirm All Ready Slips
  const handleConfirmAll = async () => {
    const readyItems = batchItems.filter(
      (it) => it.status === "ready" && it.slipData && parseFloat(it.amount) > 0
    );
    if (readyItems.length === 0) {
      toast.error("ไม่มีสลิปที่พร้อมบันทึก หรือจำนวนเงินไม่ถูกต้อง");
      return;
    }

    setIsConfirmingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of readyItems) {
      if (!item.slipData) continue;
      const numAmount = parseFloat(item.amount);
      let isoDate = new Date().toISOString();
      if (item.transactionDate) {
        try {
          isoDate = thailandDateTimeInputToUtcIso(item.transactionDate);
        } catch {
          isoDate = new Date(item.transactionDate).toISOString();
        }
      }

      try {
        await confirmMutation.mutateAsync({
          slipImportFileId: item.slipData.slipImportFileId,
          body: {
            amount: numAmount,
            transactionDate: isoDate,
            description:
              item.description.trim() ||
              (item.payeeName.trim()
                ? `โอนเงินให้ ${item.payeeName.trim()}`
                : "โอนเงินผ่านสลิป"),
            categoryId:
              item.categoryId && item.categoryId !== "none" ? Number(item.categoryId) : null,
            bankAccountId:
              item.bankAccountId && item.bankAccountId !== "none"
                ? Number(item.bankAccountId)
                : null,
            creditCardId:
              item.creditCardId && item.creditCardId !== "none"
                ? Number(item.creditCardId)
                : null,
            payeeName: item.payeeName.trim() || item.slipData.payeeName,
            payerName: item.slipData.payerName,
            transactionReference: item.slipData.transactionReference,
            tagIds: item.selectedTagIds,
          },
        });
        successCount++;
        setBatchItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: "confirmed" } : it))
        );
      } catch {
        failCount++;
      }
    }

    setIsConfirmingAll(false);
    if (successCount > 0) {
      toast.success(`บันทึกสลิปสำเร็จทั้งหมด ${successCount} รายการ!`, {
        action: {
          label: "ดูรายงาน →",
          onClick: () => router.push("/reports"),
        },
      });
    }
    if (failCount > 0) {
      toast.error(`เกิดข้อผิดพลาดในการบันทึก ${failCount} รายการ`);
    }
  };

  // Clear Entire Batch
  const handleClearAll = () => {
    batchItems.forEach((it) => {
      if (it.previewUrl) {
        try {
          URL.revokeObjectURL(it.previewUrl);
        } catch {}
      }
    });
    setBatchItems([]);
    setCurrentIndex(0);
    setIsLightboxOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (appendFileInputRef.current) appendFileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hidden Native File Inputs with multiple support */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={appendFileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Lightbox Modal for Full Image Zoom */}
      <AnimatePresence>
        {isLightboxOpen && currentItem?.previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div className="relative max-w-lg w-full max-h-[90vh] flex flex-col items-center">
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 active:scale-90 transition-transform cursor-pointer"
                aria-label="ปิดรูปภาพ"
              >
                <X className="size-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentItem.previewUrl}
                alt="Full Slip"
                className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-xs text-white/70 mt-2">แตะภายนอกเพื่อปิด</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMPTY STATE: INITIAL BATCH UPLOAD DROPZONE */}
      {batchItems.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 backdrop-blur-xs",
            isDragging
              ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/10 scale-[1.01] shadow-xl shadow-[var(--pw-primary)]/15"
              : "border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/40 hover:border-[var(--pw-primary)]/50 hover:bg-[var(--pw-surface-raised)]/70"
          )}
        >
          <div className="flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-[var(--pw-primary)]/10 text-[var(--pw-primary)] mb-3 transition-transform group-hover:scale-110">
            <UploadCloud className="size-7 sm:size-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--pw-ink)]">
            สแกนสลิปโอนเงิน (AI OCR)
          </h3>
          <p className="mt-1 max-w-sm text-xs sm:text-sm text-[var(--pw-ink)]/65">
            เลือกรูปภาพสลิปจากอัลบั้มหรือลากเข้ามาพร้อมกันได้หลายใบเพื่ออ่านยอดและลงรายการอัตโนมัติ
          </p>

          <Button
            type="button"
            size="lg"
            className="mt-6 gap-2 bg-gradient-to-r from-[var(--pw-primary)] to-blue-500 text-white font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer min-h-[44px] px-6"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="size-5" />
            <span>เลือกสลิปจากอัลบั้ม (หลายไฟล์ได้)</span>
            <ArrowRight className="size-4" />
          </Button>

          <span className="text-[11px] text-[var(--pw-ink)]/40 mt-3">
            รองรับไฟล์รูปภาพ JPEG, PNG, WEBP หรือ PDF พร้อมกันหลายใบ
          </span>
        </div>
      ) : (
        /* BATCH VIEW: QUEUE STRIP + CAROUSEL NAVIGATION + REVIEW FORM */
        <div className="space-y-4">
          {/* 1. BATCH QUEUE THUMBNAIL STRIP */}
          <Card className="p-3 sm:p-4 bg-[var(--pw-surface-raised)]/70 border border-[var(--pw-hairline)] backdrop-blur-md shadow-xs">
            {/* Header with stats and actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--pw-hairline)]">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-[var(--pw-primary)]" />
                <h3 className="text-sm font-bold text-[var(--pw-ink)]">
                  คิวสลิป ({batchItems.length} ใบ)
                </h3>
                {batchStats.ready > 0 && (
                  <span className="rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/30 text-[11px] px-2 py-0.5 font-semibold">
                    พร้อมตรวจ {batchStats.ready}
                  </span>
                )}
                {batchStats.confirmed > 0 && (
                  <span className="rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[11px] px-2 py-0.5 font-semibold">
                    บันทึกแล้ว {batchStats.confirmed}
                  </span>
                )}
                {batchStats.uploading > 0 && (
                  <span className="rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px] px-2 py-0.5 font-semibold animate-pulse flex items-center gap-1">
                    <Loader2 className="size-2.5 animate-spin" />
                    กำลังอ่าน {batchStats.uploading}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendFileInputRef.current?.click()}
                  className="h-8 gap-1.5 text-xs font-semibold border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] hover:bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)] cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>เพิ่มสลิป</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-8 text-xs text-[var(--pw-ink)]/55 hover:text-[var(--pw-accent-red)] cursor-pointer"
                >
                  <RotateCcw className="size-3 mr-1" />
                  ล้างคิว
                </Button>
              </div>
            </div>

            {/* Horizontal Scrollable Thumbnails Strip */}
            <div className="flex items-center gap-2.5 pt-3 overflow-x-auto pb-1 scrollbar-thin">
              {batchItems.map((item, index) => {
                const isActive = index === currentIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "group relative flex flex-col items-center justify-between rounded-xl border p-1.5 transition-all cursor-pointer shrink-0 w-20 sm:w-24 text-left select-none",
                      isActive
                        ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/10 ring-2 ring-[var(--pw-primary)] shadow-md scale-102"
                        : "border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 hover:bg-[var(--pw-surface-onyx)] hover:border-[var(--pw-primary)]/40"
                    )}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative size-16 sm:size-20 w-full overflow-hidden rounded-lg bg-black/30 border border-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewUrl}
                        alt={`สลิปใบที่ ${index + 1}`}
                        className="size-full object-cover"
                      />

                      {/* Status Overlay Badge */}
                      <div className="absolute top-1 right-1">
                        {item.status === "uploading" && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
                            <Loader2 className="size-3 animate-spin" />
                          </span>
                        )}
                        {item.status === "ready" && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                            <FileCheck2 className="size-3" />
                          </span>
                        )}
                        {item.status === "confirmed" && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                            <Check className="size-3 stroke-[3]" />
                          </span>
                        )}
                        {item.status === "error" && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm">
                            <AlertTriangle className="size-3" />
                          </span>
                        )}
                        {item.status === "rejected" && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-neutral-600 text-white shadow-sm">
                            <X className="size-3" />
                          </span>
                        )}
                      </div>

                      {/* Index badge at bottom-left */}
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded-md bg-black/70 text-[10px] font-bold text-white backdrop-blur-xs">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Quick amount or status text */}
                    <span className="mt-1 w-full truncate text-center text-[10px] font-medium text-[var(--pw-ink)]/75">
                      {item.status === "uploading"
                        ? "กำลังอ่าน..."
                        : item.status === "error"
                        ? "ผิดพลาด"
                        : item.amount
                        ? `฿${parseFloat(item.amount).toLocaleString("th-TH")}`
                        : "รอตรวจ"}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* 2. CAROUSEL NAVIGATION ROW */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="h-10 min-w-10 gap-1 text-xs font-semibold border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/60 hover:bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)] cursor-pointer disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">ก่อนหน้า</span>
              </Button>

              <span className="text-xs sm:text-sm font-bold text-[var(--pw-ink)] px-2">
                สลิปที่ {currentIndex + 1} จาก {batchItems.length} ใบ
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentIndex === batchItems.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(batchItems.length - 1, prev + 1))}
                className="h-10 min-w-10 gap-1 text-xs font-semibold border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/60 hover:bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)] cursor-pointer disabled:opacity-30"
              >
                <span className="hidden sm:inline">ถัดไป</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* Quick Batch Confirm All Button in Carousel Header */}
            {batchStats.ready > 1 && (
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmAll}
                disabled={isConfirmingAll}
                className="min-h-[40px] gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                {isConfirmingAll ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="size-3.5 stroke-[2.5]" />
                )}
                <span>บันทึกทั้งหมด ({batchStats.ready} ใบ)</span>
              </Button>
            )}
          </div>

          {/* 3. CURRENT SLIP REVIEW AREA */}
          {currentItem && (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Slip Preview Column (Desktop Left) */}
              <div className="hidden lg:block lg:col-span-5 space-y-3">
                <Card className="p-3.5 sm:p-4 bg-[var(--pw-surface-raised)]/60 border border-[var(--pw-hairline)] backdrop-blur-md">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[var(--pw-hairline)]">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--pw-ink)]">
                      <Receipt className="size-4 text-[var(--pw-primary)]" />
                      <span>รูปภาพสลิปใบที่ {currentIndex + 1}</span>
                    </div>
                    {currentItem.previewUrl && (
                      <button
                        type="button"
                        onClick={() => setIsLightboxOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--pw-primary)] hover:underline cursor-pointer"
                      >
                        <Maximize2 className="size-3" />
                        <span>ขยายรูป</span>
                      </button>
                    )}
                  </div>

                  {currentItem.previewUrl ? (
                    <div
                      onClick={() => setIsLightboxOpen(true)}
                      className="mt-3 relative flex justify-center rounded-xl overflow-hidden bg-black/40 border border-[var(--pw-hairline)] max-h-[260px] sm:max-h-[380px] cursor-pointer group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentItem.previewUrl}
                        alt="Slip Preview"
                        className="object-contain w-full max-h-[260px] sm:max-h-[380px] transition-transform group-hover:scale-102"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="rounded-full bg-black/70 text-white text-xs px-3 py-1 font-medium flex items-center gap-1">
                          <Maximize2 className="size-3.5" />
                          แตะเพื่อดูรูปขยาย
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col items-center justify-center py-8 text-center text-[var(--pw-ink)]/50">
                      <Receipt className="size-10 mb-2 opacity-40" />
                      <p className="text-xs">ไม่มีตัวอย่างรูปภาพ</p>
                    </div>
                  )}

                  {currentItem.slipData?.isDuplicate && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 p-2.5 text-xs text-amber-500">
                      <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">ตรวจพบสลิปซ้ำ:</span>
                        <p className="mt-0.5 text-[var(--pw-ink)]/75 text-[11px]">
                          ไฟล์สลิปนี้เคยถูกนำเข้าแล้ว คุณยังสามารถตรวจสอบและยืนยันบันทึกได้หากจำเป็น
                        </p>
                      </div>
                    </div>
                  )}

                  {currentItem.status === "error" && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/25 p-2.5 text-xs text-rose-500">
                      <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">AI ไม่สามารถอ่านสลิปนี้ได้:</span>
                        <p className="mt-0.5 text-[var(--pw-ink)]/75 text-[11px]">
                          {currentItem.errorMessage || "กรุณากรอกข้อมูลธุรกรรมด้วยตนเอง หรือข้ามสลิปนี้"}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Form & Verification Column */}
              <div className="lg:col-span-7">
                <Card className="p-4 sm:p-6 bg-[var(--pw-surface-raised)]/60 border border-[var(--pw-hairline)] backdrop-blur-md space-y-4">
                  {/* Card Header with Top-Right Thumbnail on Mobile */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--pw-hairline)]">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-[var(--pw-ink)]">
                          ตรวจสอบข้อมูลสลิป #{currentIndex + 1}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-primary)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--pw-primary)]">
                          <Sparkles className="size-3" />
                          อ่านด้วย AI
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                            currentItem.status === "confirmed"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : currentItem.status === "rejected"
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              : currentItem.status === "uploading"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : currentItem.status === "error"
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              : currentItem.slipData?.isDuplicate
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] border border-[var(--pw-primary)]/30"
                          )}
                        >
                          {currentItem.status === "confirmed"
                            ? "บันทึกแล้ว"
                            : currentItem.status === "rejected"
                            ? "ปฏิเสธแล้ว"
                            : currentItem.status === "uploading"
                            ? "กำลังอ่านข้อมูล..."
                            : currentItem.status === "error"
                            ? "เกิดข้อผิดพลาด"
                            : currentItem.slipData?.isDuplicate
                            ? "ตรวจพบซ้ำ"
                            : "รอตรวจสอบ"}
                        </span>
                      </div>
                    </div>

                    {/* Top-Right Slip Thumbnail on Mobile */}
                    {currentItem.previewUrl && (
                      <button
                        type="button"
                        onClick={() => setIsLightboxOpen(true)}
                        className="group relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-xl border-2 border-[var(--pw-primary)]/40 bg-black/50 shadow-md active:scale-95 transition-all cursor-pointer lg:hidden"
                        aria-label="ดูรูปสลิปขยายเต็มจอ"
                        title="แตะเพื่อดูรูปสลิปขยายเต็มจอ"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentItem.previewUrl}
                          alt="Slip Thumbnail"
                          className="size-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                          <Maximize2 className="size-4 text-white drop-shadow" />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* 1. HERO AMOUNT INPUT */}
                  <FormField label="จำนวนเงิน (บาท)">
                    <NumberInput
                      id="slip-amount"
                      step={0.01}
                      min={0.01}
                      placeholder="0.00"
                      value={currentItem.amount}
                      disabled={currentItem.status === "confirmed" || currentItem.status === "uploading"}
                      onChange={(e) => updateCurrentItem({ amount: e.target.value })}
                      prefixNode={<span className="text-xl font-bold text-[var(--pw-ink)]/50">฿</span>}
                      className="h-14 text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--pw-ink)] bg-[var(--pw-surface-black)]/35 border-[var(--pw-input-border)] focus:border-[var(--pw-primary)] rounded-[var(--pw-rounded-sm)]"
                    />
                  </FormField>

                  {/* 2. QUICK CATEGORY CHIPS */}
                  <FormField
                    label={
                      <div className="flex items-center gap-1.5">
                        <span>หมวดหมู่</span>
                        {currentItem.slipData?.suggestedCategoryName && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[var(--pw-primary)] bg-[var(--pw-primary)]/15 px-1.5 py-0.5 rounded-md font-medium">
                            <Sparkles className="size-3" />
                            AI แนะนำจากสลิป
                          </span>
                        )}
                      </div>
                    }
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {quickCategories.map((cat) => {
                          const isSelected = currentItem.categoryId === String(cat.categoryId);
                          return (
                            <button
                              key={cat.categoryId}
                              type="button"
                              onClick={() => handleSelectCategory(isSelected ? null : cat.categoryId)}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 cursor-pointer border",
                                isSelected
                                  ? "bg-[var(--pw-primary)] text-[var(--pw-on-primary)] border-[var(--pw-primary)] shadow-sm font-semibold scale-102"
                                  : "bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/85 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:border-[var(--pw-primary)]/50"
                              )}
                            >
                              {isSelected && <Check className="size-3 stroke-[3]" />}
                              <span>{cat.categoryName}</span>
                            </button>
                          );
                        })}

                        {/* Selected category if outside top 6 */}
                        {outsideSelectedCategory && (
                          <button
                            type="button"
                            onClick={() => handleSelectCategory(null)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-[var(--pw-primary)] text-[var(--pw-on-primary)] border border-[var(--pw-primary)] shadow-sm scale-102 cursor-pointer"
                          >
                            <Check className="size-3 stroke-[3]" />
                            <span>{outsideSelectedCategory.categoryName}</span>
                          </button>
                        )}

                        {/* Toggle All Categories Dropdown */}
                        <button
                          type="button"
                          onClick={() => setShowAllCategories((prev) => !prev)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium border border-dashed transition-all cursor-pointer",
                            showAllCategories
                              ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/10 text-[var(--pw-primary)] font-semibold"
                              : "border-[var(--pw-hairline)] text-[var(--pw-ink)]/60 hover:text-[var(--pw-ink)] hover:border-[var(--pw-ink)]/40"
                          )}
                        >
                          <Pencil className="size-3" />
                          <span>{showAllCategories ? "ซ่อนรายการทั้งหมด" : "หมวดหมู่อื่นๆ"}</span>
                        </button>
                      </div>

                      {/* Full Category Select Dropdown */}
                      {showAllCategories && (
                        <div className="pt-1">
                          <Select
                            value={currentItem.categoryId || "none"}
                            onValueChange={(val) => handleSelectCategory(val === "none" ? null : Number(val))}
                            disabled={currentItem.status === "confirmed" || currentItem.status === "uploading"}
                          >
                            <SelectTrigger id="slip-category-select">
                              <SelectValue placeholder="— เลือกจากหมวดหมู่ทั้งหมด —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                              {categories.map((cat) => (
                                <SelectItem key={cat.categoryId} value={String(cat.categoryId)}>
                                  {cat.categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Secondary AI Suggestion from description */}
                      {categorySuggestion && String(categorySuggestion.categoryId) !== currentItem.categoryId && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-xs text-[var(--pw-primary)] hover:text-[var(--pw-primary)]/80 mt-1 flex items-center gap-1.5 px-2 py-1 h-auto"
                          onClick={() => handleSelectCategory(categorySuggestion.categoryId)}
                        >
                          <Sparkles className="size-3.5" />
                          <span>
                            ใช้คำแนะนำจากข้อความ: <strong>{categorySuggestion.categoryName ?? "หมวดหมู่"}</strong>
                          </span>
                        </Button>
                      )}
                    </div>
                  </FormField>

                  {/* 3. PROGRESSIVE DISCLOSURE DATE & TIME */}
                  <div className="space-y-1.5">
                    {!currentItem.isCustomDateTime ? (
                      <div className="flex items-center justify-between rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 text-[var(--pw-ink)]/75">
                          <Calendar className="size-3.5 text-[var(--pw-primary)]" />
                          <span>
                            เวลาโอน: <strong className="text-[var(--pw-ink)] font-semibold">{displayDateSummary}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateCurrentItem({ isCustomDateTime: true })}
                          className="text-[var(--pw-link)] hover:underline font-medium cursor-pointer"
                        >
                          เปลี่ยนวันที่/เวลา
                        </button>
                      </div>
                    ) : (
                      <FormField label="วันที่และเวลา (ค.ศ. / เวลาไทย)">
                        <div className="space-y-1.5">
                          <DateTimeInput
                            value={currentItem.transactionDate}
                            disabled={currentItem.status === "confirmed" || currentItem.status === "uploading"}
                            onChange={(val) => updateCurrentItem({ transactionDate: val })}
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => updateCurrentItem({ isCustomDateTime: false })}
                              className="text-[11px] text-[var(--pw-ink)]/60 hover:text-[var(--pw-link)] cursor-pointer"
                            >
                              ซ่อน
                            </button>
                          </div>
                        </div>
                      </FormField>
                    )}
                  </div>

                  {/* 4. ACCOUNTS & PAYEE SELECTION */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="บัญชีที่โอนเงิน">
                      <Select
                        value={currentItem.bankAccountId || "none"}
                        onValueChange={(val) => {
                          const nextVal = val === "none" ? "" : val;
                          updateCurrentItem({ bankAccountId: nextVal, creditCardId: "" });
                          if (nextVal) {
                            try {
                              localStorage.setItem("pocketwise_last_bank_account_id", nextVal);
                            } catch {}
                          }
                        }}
                        disabled={currentItem.status === "confirmed" || currentItem.status === "uploading"}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="— ไม่ระบุ —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                          {bankAccounts.map((acc) => (
                            <SelectItem key={acc.bankAccountId} value={String(acc.bankAccountId)}>
                              {acc.accountName} ({acc.bankName}
                              {acc.bankCode ? ` [${acc.bankCode}]` : ""})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {currentItem.slipData?.bankCode ? (
                        <div className="mt-1 text-[11px]">
                          {matchedAccount ? (
                            <p className="text-[var(--pw-green)] flex items-center gap-1 font-medium">
                              <Check className="size-3 stroke-[2.5]" />
                              <span>จับคู่อัตโนมัติกับรหัสธนาคาร: {currentItem.slipData.bankCode}</span>
                            </p>
                          ) : (
                            <p className="text-amber-500/90 dark:text-amber-400/90 flex items-center gap-1 font-medium">
                              <span>⚠️ ไม่พบบัญชีที่ตรงกับรหัสธนาคาร {currentItem.slipData.bankCode}</span>
                            </p>
                          )}
                        </div>
                      ) : null}
                    </FormField>

                    <FormField label="ผู้รับเงิน / ร้านค้า">
                      <Input
                        placeholder="เช่น บจก. ซีพี ออลล์, ร้านกาแฟ"
                        value={currentItem.payeeName}
                        disabled={currentItem.status === "confirmed" || currentItem.status === "uploading"}
                        onChange={(e) => updateCurrentItem({ payeeName: e.target.value })}
                      />
                    </FormField>
                  </div>

                  {/* 5. DESCRIPTION / NOTE */}
                  <FormField label="รายละเอียด / หมายเหตุ">
                    <Input
                      placeholder="เช่น ค่าอาหารกลางวัน, ชำระค่าสินค้า"
                      value={currentItem.description}
                      disabled={currentItem.status === "confirmed" || currentItem.status === "uploading"}
                      onChange={(e) => updateCurrentItem({ description: e.target.value })}
                    />
                  </FormField>

                  {/* 6. COLLAPSIBLE TAGS */}
                  {tags && tags.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowTagsSection((prev) => !prev)}
                        className="flex items-center gap-1.5 text-xs text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] cursor-pointer"
                      >
                        <TagIcon className="size-3.5" />
                        <span className="font-medium">แท็ก</span>
                        {currentItem.selectedTagIds && currentItem.selectedTagIds.length > 0 && (
                          <span className="rounded-full bg-[var(--pw-primary)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--pw-primary)]">
                            {currentItem.selectedTagIds.length}
                          </span>
                        )}
                        <ChevronDown className={cn("size-3 transition-transform", showTagsSection && "rotate-180")} />
                      </button>

                      {showTagsSection && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {tags.map((t) => {
                            const checked = currentItem.selectedTagIds.includes(t.tagId);
                            const color = t.color ?? "#ec48bd";
                            const textColor = getReadableTextColor(color);
                            const isDarkText = textColor === "#000000";

                            return (
                              <label
                                key={t.tagId}
                                className={cn(
                                  "group inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all select-none shadow-2xs",
                                  checked
                                    ? "opacity-100 ring-2 ring-[var(--pw-link)] ring-offset-2 ring-offset-[var(--pw-canvas)] border-transparent"
                                    : "opacity-65 hover:opacity-90 border-transparent",
                                  (currentItem.status === "confirmed" || currentItem.status === "uploading") &&
                                    "pointer-events-none opacity-40"
                                )}
                                style={{
                                  backgroundColor: color,
                                  color: textColor,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={checked}
                                  disabled={currentItem.status === "confirmed" || currentItem.status === "uploading"}
                                  aria-label={`เลือกแท็ก ${t.tagName}`}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...currentItem.selectedTagIds, t.tagId]
                                      : currentItem.selectedTagIds.filter((id) => id !== t.tagId);
                                    updateCurrentItem({ selectedTagIds: next });
                                  }}
                                />
                                <span
                                  className={cn(
                                    "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-all",
                                    checked
                                      ? isDarkText
                                        ? "bg-black text-white border-black"
                                        : "bg-white text-black border-white"
                                      : isDarkText
                                      ? "border-black/50 bg-black/10 group-hover:border-black/80"
                                      : "border-white/60 bg-white/15 group-hover:border-white"
                                  )}
                                >
                                  {checked && <Check className="size-2.5 stroke-[3]" />}
                                </span>
                                <span>#{t.tagName}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 7. COLLAPSIBLE DETECTED DETAILS */}
                  {currentItem.slipData && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDetectedPills((prev) => !prev)}
                        className="flex items-center gap-1.5 text-xs text-[var(--pw-ink)]/50 hover:text-[var(--pw-ink)] cursor-pointer"
                      >
                        <Receipt className="size-3.5" />
                        <span>ข้อมูลเพิ่มเติมจากสลิป (รหัสอ้างอิง, ธนาคาร)</span>
                        <ChevronDown className={cn("size-3 transition-transform", showDetectedPills && "rotate-180")} />
                      </button>

                      {showDetectedPills && (
                        <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--pw-surface-indigo)]/50 p-2.5 rounded-lg border border-[var(--pw-hairline)] mt-2">
                          <div>
                            <span className="text-[var(--pw-ink)]/50">ผู้โอนเงิน:</span>
                            <div className="font-medium text-[var(--pw-ink)] truncate">
                              {currentItem.slipData.payerName || "-"}
                            </div>
                          </div>
                          <div>
                            <span className="text-[var(--pw-ink)]/50">รหัสอ้างอิง:</span>
                            <div className="font-medium text-[var(--pw-ink)] truncate">
                              {currentItem.slipData.transactionReference || "-"}
                            </div>
                          </div>
                          <div>
                            <span className="text-[var(--pw-ink)]/50">ธนาคาร:</span>
                            <div className="font-medium text-[var(--pw-ink)] truncate">
                              {currentItem.slipData.bankCode || "ตรวจจับอัตโนมัติ"}
                            </div>
                          </div>
                          <div>
                            <span className="text-[var(--pw-ink)]/50">ไฟล์ต้นฉบับ:</span>
                            <div className="font-medium text-[var(--pw-ink)] truncate">
                              {currentItem.slipData.originalFileName}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 8. ACTION BUTTONS HIERARCHY (Mobile Standard: Confirm Top, Cancel Below, Target >= 44px) */}
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--pw-hairline)]">
                    {/* Primary Action Button (Order 1 on mobile) */}
                    {currentItem.status !== "confirmed" ? (
                      <Button
                        type="button"
                        className="w-full min-h-[44px] gap-2 bg-[var(--pw-green)] text-[var(--pw-on-green)] hover:brightness-110 font-bold active:scale-[0.98] transition-transform shadow-md cursor-pointer order-1"
                        disabled={isActionLoading || currentItem.status === "uploading"}
                        onClick={handleConfirmCurrent}
                      >
                        {isActionLoading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4 stroke-[3]" />
                        )}
                        <span>
                          {isActionLoading
                            ? "กำลังบันทึก..."
                            : batchItems.length > 1
                            ? "บันทึกสลิปนี้และไปใบถัดไป"
                            : "ยืนยันและบันทึกรายการ"}
                        </span>
                      </Button>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center justify-between order-1">
                        <span className="flex items-center gap-1.5">
                          <Check className="size-4 stroke-[3]" />
                          สลิปนี้บันทึกรายการแล้ว
                        </span>
                        {currentIndex < batchItems.length - 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentIndex((prev) => prev + 1)}
                            className="h-8 text-xs font-bold gap-1 border-emerald-500/40 text-emerald-400"
                          >
                            <span>ไปใบถัดไป</span>
                            <ChevronRight className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Batch Confirm All Button (Order 2 on mobile) */}
                    {batchStats.ready > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full min-h-[44px] gap-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-bold active:scale-[0.98] transition-transform cursor-pointer order-2"
                        disabled={isConfirmingAll}
                        onClick={handleConfirmAll}
                      >
                        {isConfirmingAll ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CheckCheck className="size-4 stroke-[2.5]" />
                        )}
                        <span>บันทึกทุกสลิปที่อ่านสำเร็จพร้อมกัน ({batchStats.ready} ใบ)</span>
                      </Button>
                    )}

                    {/* Secondary Navigation & Cancel Actions (Order 3 & 4 on mobile) */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 order-3">
                      {batchItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full sm:w-auto min-h-[44px] gap-1.5 text-xs text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] hover:bg-[var(--pw-surface-indigo)] cursor-pointer order-1 sm:order-none"
                          onClick={handleSkipCurrent}
                        >
                          <SkipForward className="size-4" />
                          <span>ข้ามสลิปนี้</span>
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full sm:w-auto min-h-[44px] gap-1.5 text-xs text-[var(--pw-accent-red)] hover:bg-[var(--pw-accent-red)]/10 cursor-pointer order-2 sm:order-none"
                        onClick={handleRemoveOrRejectCurrent}
                      >
                        <Trash2 className="size-4" />
                        <span>
                          {currentItem.status === "confirmed"
                            ? "ลบออกจากคิว"
                            : "ข้าม/ลบสลิปนี้ออกจากคิว"}
                        </span>
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

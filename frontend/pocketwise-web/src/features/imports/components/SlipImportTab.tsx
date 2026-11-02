"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  Check,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Receipt,
  Image as ImageIcon,
  Maximize2,
  Calendar,
  ChevronDown,
  Tag as TagIcon,
  Pencil,
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
import { useCreditCards } from "@/features/credit-cards/hooks/useCreditCards";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { apiClient } from "@/lib/api-client";
import { useTags } from "@/features/tags/hooks/useTags";
import { useCategorySuggestion } from "@/features/categorization/hooks/useCategorization";
import {
  useUploadSlip,
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

export function SlipImportTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedSlip, setUploadedSlip] = useState<SlipImportResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // UX States matching TransactionForm
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isCustomDateTime, setIsCustomDateTime] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showTagsSection, setShowTagsSection] = useState(false);
  const [showDetectedPills, setShowDetectedPills] = useState(false);

  // Review form state
  const [amount, setAmount] = useState<string>("");
  const [transactionDate, setTransactionDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [payeeName, setPayeeName] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [creditCardId, setCreditCardId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [debouncedDescription, setDebouncedDescription] = useState("");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: creditCards = [] } = useCreditCards();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const uploadMutation = useUploadSlip();
  const confirmMutation = useConfirmSlip();
  const rejectMutation = useRejectSlip();

  const matchedAccount = useMemo(() => {
    if (!uploadedSlip?.bankCode) return null;
    return findMatchingBankAccount(uploadedSlip.bankCode, bankAccounts);
  }, [uploadedSlip?.bankCode, bankAccounts]);

  // Match bank account when uploaded slip or bank accounts change
  useEffect(() => {
    if (uploadedSlip?.bankCode && bankAccounts.length > 0) {
      const matched = findMatchingBankAccount(uploadedSlip.bankCode, bankAccounts);
      setBankAccountId(matched ? String(matched.bankAccountId) : "");
    }
  }, [uploadedSlip?.bankCode, bankAccounts]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedDescription(description ?? ""), 300);
    return () => window.clearTimeout(timeout);
  }, [description]);

  const { data: categorySuggestion } = useCategorySuggestion(
    debouncedDescription,
    Boolean(debouncedDescription && debouncedDescription.trim().length >= 2),
  );

  const applySlipData = (data: SlipImportResponse) => {
    setUploadedSlip(data);
    if (data.detectedAmount) {
      setAmount(String(data.detectedAmount));
    } else {
      setAmount("");
    }
    if (data.detectedAt) {
      try {
        setTransactionDate(toThailandDateTimeInputValue(data.detectedAt));
      } catch {
        setTransactionDate(toThailandDateTimeInputValue(new Date()));
      }
    } else {
      setTransactionDate(toThailandDateTimeInputValue(new Date()));
    }
    setPayeeName(data.payeeName ?? "");
    setCreditCardId("");
    if (data.payeeName) {
      setDescription(`โอนเงินให้ ${data.payeeName}`);
    } else if (data.payerName) {
      setDescription(`รับเงินจาก ${data.payerName}`);
    } else {
      setDescription("");
    }
    if (data.suggestedCategoryId) {
      setCategoryId(String(data.suggestedCategoryId));
    }
    // Match bank account based on slip bankCode
    const matched = findMatchingBankAccount(data.bankCode, bankAccounts);
    if (matched) {
      setBankAccountId(String(matched.bankAccountId));
    } else {
      setBankAccountId("");
    }
  };

  useEffect(() => {
    const handleSlipUploaded = async (e: Event) => {
      const customEvent = e as CustomEvent<{ relatedEntityType?: string; relatedEntityId?: number | string }>;
      const slipId = customEvent.detail?.relatedEntityId;
      if (!slipId) return;

      try {
        const res = await apiClient.get<SlipImportResponse>(`/api/v1/imports/slips/${slipId}`);
        if (res) {
          applySlipData(res);
          setStatusMessage(null);
        }
      } catch {}
    };

    window.addEventListener("pocketwise:slip_uploaded", handleSlipUploaded);
    return () => {
      window.removeEventListener("pocketwise:slip_uploaded", handleSlipUploaded);
    };
  }, [bankAccounts, bankAccountId]);

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
        if (!ctx) { resolve(file); return; }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        }, "image/jpeg", 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  const handleProcessFile = async (file: File) => {
    if (!file) return;
    setStatusMessage(null);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    const formData = new FormData();
    const processedFile = await prepareSlipFile(file);
    formData.append("file", processedFile);

    uploadMutation.mutate(formData, {
      onSuccess: (data) => {
        applySlipData(data);
        toast.success("AI อ่านข้อมูลสลิปสำเร็จ!");
      },
      onError: (err) => {
        setStatusMessage({
          type: "error",
          text: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลดสลิป",
        });
      },
    });
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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleProcessFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleProcessFile(file);
    }
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
  const outsideSelectedCategory = useMemo(() => {
    if (!categoryId || categoryId === "none") return null;
    if (quickCategories.some((c) => String(c.categoryId) === categoryId)) return null;
    return availableCategories.find((c) => String(c.categoryId) === categoryId) ?? null;
  }, [availableCategories, quickCategories, categoryId]);

  // Format date summary for progressive disclosure
  const displayDateSummary = useMemo(() => {
    if (!transactionDate) return "เวลาปัจจุบัน";
    try {
      return formatDisplayDateTime(transactionDate);
    } catch {
      return "เวลาปัจจุบัน";
    }
  }, [transactionDate]);

  const handleSelectCategory = (catId: number | null) => {
    const val = catId == null ? "" : String(catId);
    setCategoryId(val);
    if (catId) {
      recordCategoryUsage(catId);
    }
  };

  const handleConfirm = () => {
    if (!uploadedSlip) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setStatusMessage({ type: "error", text: "กรุณาระบุจำนวนเงินให้ถูกต้อง" });
      return;
    }

    let isoDate = new Date().toISOString();
    if (transactionDate) {
      try {
        isoDate = thailandDateTimeInputToUtcIso(transactionDate);
      } catch {
        isoDate = new Date(transactionDate).toISOString();
      }
    }

    confirmMutation.mutate(
      {
        slipImportFileId: uploadedSlip.slipImportFileId,
        body: {
          amount: numAmount,
          transactionDate: isoDate,
          description: description.trim() || (payeeName.trim() ? `โอนเงินให้ ${payeeName.trim()}` : "โอนเงินผ่านสลิป"),
          categoryId: categoryId && categoryId !== "none" ? Number(categoryId) : null,
          bankAccountId: bankAccountId && bankAccountId !== "none" ? Number(bankAccountId) : null,
          creditCardId: creditCardId && creditCardId !== "none" ? Number(creditCardId) : null,
          payeeName: payeeName.trim() || uploadedSlip.payeeName,
          payerName: uploadedSlip.payerName,
          transactionReference: uploadedSlip.transactionReference,
          tagIds: selectedTagIds,
        },
      },
      {
        onSuccess: () => {
          if (bankAccountId && bankAccountId !== "none") {
            try {
              localStorage.setItem("pocketwise_last_bank_account_id", bankAccountId);
            } catch {}
          }
          if (categoryId && categoryId !== "none") {
            recordCategoryUsage(Number(categoryId));
          }
          toast.success("ยืนยันและบันทึกรายการธุรกรรมเรียบร้อยแล้ว");
          setStatusMessage({
            type: "success",
            text: "ยืนยันและบันทึกรายการธุรกรรมเรียบร้อยแล้ว",
          });
          handleReset(true);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกรายการ";
          toast.error(msg);
          setStatusMessage({
            type: "error",
            text: msg,
          });
        },
      },
    );
  };

  const handleReject = () => {
    if (!uploadedSlip) return;
    rejectMutation.mutate(uploadedSlip.slipImportFileId, {
      onSuccess: () => {
        toast.info("ปฏิเสธสลิปรายการนี้เรียบร้อยแล้ว");
        setStatusMessage({
          type: "success",
          text: "ปฏิเสธสลิปรายการนี้เรียบร้อยแล้ว",
        });
        handleReset(true);
      },
      onError: (err) => {
        setStatusMessage({
          type: "error",
          text: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการปฏิเสธสลิป",
        });
      },
    });
  };

  const handleReset = (keepStatusMessage = false) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setUploadedSlip(null);
    setAmount("");
    setDescription("");
    setPayeeName("");
    setBankAccountId("");
    setCreditCardId("");
    setCategoryId("");
    setTransactionDate("");
    setSelectedTagIds([]);
    setIsCustomDateTime(false);
    setShowAllCategories(false);
    setShowTagsSection(false);
    setShowDetectedPills(false);
    setIsLightboxOpen(false);
    if (!keepStatusMessage) {
      setStatusMessage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {statusMessage && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-[var(--pw-accent-green)]/10 text-[var(--pw-accent-green)] border border-[var(--pw-accent-green)]/20"
              : "bg-[var(--pw-accent-red)]/10 text-[var(--pw-accent-red)] border border-[var(--pw-accent-red)]/20"
          }`}
        >
          {statusMessage.type === "success" ? (
            <FileCheck2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploadMutation.isPending}
      />

      {/* Lightbox Modal for Full Image Zoom */}
      <AnimatePresence>
        {isLightboxOpen && previewUrl && (
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
                src={previewUrl}
                alt="Full Slip"
                className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-xs text-white/70 mt-2">แตะภายนอกเพื่อปิด</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!uploadedSlip ? (
        /* STEP 1: INITIAL UPLOAD BOX (ปุ่มเดี่ยว: เลือกจากอัลบั้ม) */
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
          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 w-full">
              {previewUrl ? (
                <div className="relative mx-auto w-full max-w-xs sm:max-w-sm overflow-hidden rounded-xl border border-[var(--pw-primary)]/40 shadow-2xl bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Slip Scanning" className="w-full object-contain max-h-[320px] opacity-80" />
                  <motion.div
                    animate={{ y: [0, 290, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee,0_0_30px_#06b6d4] z-10"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
                </div>
              ) : (
                <div className="relative flex size-20 items-center justify-center rounded-full bg-[var(--pw-primary)]/10">
                  <span className="absolute -inset-2 rounded-full border border-[var(--pw-primary)]/30 animate-ping" />
                  <Sparkles className="size-10 text-[var(--pw-primary)] animate-spin" />
                </div>
              )}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--pw-primary)]/15 px-3 py-1 text-xs font-semibold text-[var(--pw-primary)]">
                  <Sparkles className="size-3.5 animate-pulse" />
                  <span>AI กำลังวิเคราะห์ยอดเงินและอ่านสลิป...</span>
                </div>
                <p className="max-w-sm text-xs text-[var(--pw-ink)]/60 pt-1">
                  กำลังแปลงภาพและดึงข้อมูลอัตโนมัติ กรุณารอสักครู่
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-[var(--pw-primary)]/10 text-[var(--pw-primary)] mb-3 transition-transform group-hover:scale-110">
                <UploadCloud className="size-7 sm:size-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--pw-ink)]">
                สแกนสลิปโอนเงิน (AI OCR)
              </h3>
              <p className="mt-1 max-w-sm text-xs sm:text-sm text-[var(--pw-ink)]/65">
                เลือกรูปภาพสลิปจากอัลบั้มเพื่ออ่านยอดและลงรายการอัตโนมัติ
              </p>

              {/* Single Clear Upload Button (ยุบเหลือปุ่มเดียวตามที่ผู้ใช้ร้องขอ) */}
              <Button
                type="button"
                size="lg"
                className="mt-6 gap-2 bg-gradient-to-r from-[var(--pw-primary)] to-blue-500 text-white font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer px-6"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="size-5" />
                <span>เลือกจากอัลบั้ม</span>
                <ArrowRight className="size-4" />
              </Button>

              <span className="text-[11px] text-[var(--pw-ink)]/40 mt-3">
                รองรับไฟล์รูปภาพ JPEG, PNG, WEBP หรือ PDF
              </span>
            </>
          )}
        </div>
      ) : (
        /* STEP 2: VERIFICATION FORM MATCHING TRANSACTIONFORM DESIGN */
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Slip Thumbnail / Preview Column (Desktop side-by-side) */}
          <div className="hidden lg:block lg:col-span-5 space-y-3">
            <Card className="p-3.5 sm:p-4 bg-[var(--pw-surface-raised)]/60 border border-[var(--pw-hairline)] backdrop-blur-md">
              <div className="flex items-center justify-between pb-2.5 border-b border-[var(--pw-hairline)]">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--pw-ink)]">
                  <Receipt className="size-4 text-[var(--pw-primary)]" />
                  <span>รูปภาพสลิป</span>
                </div>
                {previewUrl && (
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

              {previewUrl ? (
                <div
                  onClick={() => setIsLightboxOpen(true)}
                  className="mt-3 relative flex justify-center rounded-xl overflow-hidden bg-black/40 border border-[var(--pw-hairline)] max-h-[260px] sm:max-h-[380px] cursor-pointer group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
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

              {uploadedSlip.isDuplicate && (
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
            </Card>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:text-[var(--pw-ink)] active:scale-98 transition-all cursor-pointer"
              onClick={() => handleReset(false)}
            >
              <RotateCcw className="size-3.5" />
              <span>เลือกสลิปอื่น</span>
            </Button>
          </div>

          {/* Form & Verification Column: Exactly Matching TransactionForm Standard */}
          <div className="lg:col-span-7">
            <Card className="p-4 sm:p-6 bg-[var(--pw-surface-raised)]/60 border border-[var(--pw-hairline)] backdrop-blur-md space-y-4">
              {/* Card Header with Top-Right Thumbnail on Mobile */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--pw-hairline)]">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--pw-ink)]">
                      ตรวจสอบข้อมูลรายการ
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
                        uploadedSlip.reviewStatus === "confirmed"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : uploadedSlip.reviewStatus === "rejected"
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : uploadedSlip.isDuplicate
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] border border-[var(--pw-primary)]/30"
                      )}
                    >
                      {uploadedSlip.reviewStatus === "confirmed"
                        ? "บันทึกแล้ว"
                        : uploadedSlip.reviewStatus === "rejected"
                        ? "ปฏิเสธแล้ว"
                        : uploadedSlip.isDuplicate
                        ? "ตรวจพบซ้ำ"
                        : "รอตรวจสอบ"}
                    </span>

                    {/* Button to reset/re-upload on mobile */}
                    <button
                      type="button"
                      onClick={() => handleReset(false)}
                      className="text-xs text-[var(--pw-ink)]/55 hover:text-[var(--pw-ink)] lg:hidden underline cursor-pointer"
                    >
                      เลือกสลิปอื่น
                    </button>
                  </div>
                </div>

                {/* Top-Right Slip Thumbnail on Mobile (ข้อ 3: ย่อรูปภาพไปมุมขวาบน แตะเพื่อซูม) */}
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="group relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-xl border-2 border-[var(--pw-primary)]/40 bg-black/50 shadow-md active:scale-95 transition-all cursor-pointer lg:hidden"
                    aria-label="ดูรูปสลิปขยายเต็มจอ"
                    title="แตะเพื่อดูรูปสลิปขยายเต็มจอ"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Slip Thumbnail"
                      className="size-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="size-4 text-white drop-shadow" />
                    </div>
                  </button>
                )}
              </div>

              {/* 1. HERO AMOUNT INPUT (Light Mode คมชัดด้วย text-[var(--pw-ink)]) */}
              <FormField label="จำนวนเงิน (บาท)">
                <NumberInput
                  id="slip-amount"
                  step={0.01}
                  min={0.01}
                  placeholder="0.00"
                  value={amount}
                  disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
                  onChange={(e) => setAmount(e.target.value)}
                  prefixNode={<span className="text-xl font-bold text-[var(--pw-ink)]/50">฿</span>}
                  className="h-14 text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--pw-ink)] bg-[var(--pw-surface-black)]/35 border-[var(--pw-input-border)] focus:border-[var(--pw-primary)] rounded-[var(--pw-rounded-sm)]"
                />
              </FormField>

              {/* 2. QUICK CATEGORY CHIPS (ปุ่มเลือกหมวดหมู่ทันที + หมวดหมู่อื่นๆ) */}
              <FormField
                label={
                  <div className="flex items-center gap-1.5">
                    <span>หมวดหมู่</span>
                    {uploadedSlip.suggestedCategoryName && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--pw-primary)] bg-[var(--pw-primary)]/15 px-1.5 py-0.5 rounded-md font-medium">
                        <Sparkles className="size-3" />
                        AI แนะนำจากสลิป
                      </span>
                    )}
                  </div>
                }
              >
                <div className="space-y-2">
                  {/* Category Chips Grid */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {quickCategories.map((cat) => {
                      const isSelected = categoryId === String(cat.categoryId);
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
                        value={categoryId || "none"}
                        onValueChange={(val) => handleSelectCategory(val === "none" ? null : Number(val))}
                        disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
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
                  {categorySuggestion && String(categorySuggestion.categoryId) !== categoryId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-xs text-[var(--pw-primary)] hover:text-[var(--pw-primary)]/80 mt-1 flex items-center gap-1.5 px-2 py-1 h-auto"
                      onClick={() => handleSelectCategory(categorySuggestion.categoryId)}
                    >
                      <Sparkles className="size-3.5" />
                      <span>ใช้คำแนะนำจากข้อความ: <strong>{categorySuggestion.categoryName ?? "หมวดหมู่"}</strong></span>
                    </Button>
                  )}
                </div>
              </FormField>

              {/* 3. PROGRESSIVE DISCLOSURE DATE & TIME (เหมือนหน้า Transactions) */}
              <div className="space-y-1.5">
                {!isCustomDateTime ? (
                  <div className="flex items-center justify-between rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 text-[var(--pw-ink)]/75">
                      <Calendar className="size-3.5 text-[var(--pw-primary)]" />
                      <span>เวลาโอน: <strong className="text-[var(--pw-ink)] font-semibold">{displayDateSummary}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCustomDateTime(true)}
                      className="text-[var(--pw-link)] hover:underline font-medium cursor-pointer"
                    >
                      เปลี่ยนวันที่/เวลา
                    </button>
                  </div>
                ) : (
                  <FormField label="วันที่และเวลา (ค.ศ. / เวลาไทย)">
                    <div className="space-y-1.5">
                      <DateTimeInput
                        value={transactionDate}
                        disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
                        onChange={setTransactionDate}
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsCustomDateTime(false)}
                          className="text-[11px] text-[var(--pw-ink)]/60 hover:text-[var(--pw-link)] cursor-pointer"
                        >
                          ซ่อน
                        </button>
                      </div>
                    </div>
                  </FormField>
                )}
              </div>

              {/* 4. ACCOUNTS SELECTION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="บัญชีที่โอนเงิน">
                  <Select
                    value={bankAccountId || "none"}
                    onValueChange={(val) => {
                      const nextVal = val === "none" ? "" : val;
                      setBankAccountId(nextVal);
                      if (nextVal) {
                        setCreditCardId("");
                        try {
                          localStorage.setItem("pocketwise_last_bank_account_id", nextVal);
                        } catch {}
                      }
                    }}
                    disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="— ไม่ระบุ —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                      {bankAccounts.map((acc) => (
                        <SelectItem key={acc.bankAccountId} value={String(acc.bankAccountId)}>
                          {acc.accountName} ({acc.bankName}{acc.bankCode ? ` [${acc.bankCode}]` : ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {uploadedSlip.bankCode ? (
                    <div className="mt-1 text-[11px]">
                      {matchedAccount ? (
                        <p className="text-[var(--pw-green)] flex items-center gap-1 font-medium">
                          <Check className="size-3 stroke-[2.5]" />
                          <span>จับคู่อัตโนมัติกับรหัสธนาคาร: {uploadedSlip.bankCode}</span>
                        </p>
                      ) : (
                        <p className="text-amber-500/90 dark:text-amber-400/90 flex items-center gap-1 font-medium">
                          <span>⚠️ ไม่พบบัญชีที่ตรงกับรหัสธนาคาร {uploadedSlip.bankCode} (กรุณาเลือกบัญชีเอง หรือเพิ่มบัญชีใหม่)</span>
                        </p>
                      )}
                    </div>
                  ) : null}
                </FormField>

                <FormField label="ผู้รับเงิน / ร้านค้า">
                  <Input
                    placeholder="เช่น บจก. ซีพี ออลล์, ร้านกาแฟ"
                    value={payeeName}
                    disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
                    onChange={(e) => setPayeeName(e.target.value)}
                  />
                </FormField>
              </div>

              {/* 5. DESCRIPTION / NOTE */}
              <FormField label="รายละเอียด / หมายเหตุ">
                <Input
                  placeholder="เช่น ค่าอาหารกลางวัน, ชำระค่าสินค้า"
                  value={description}
                  disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormField>

              {/* 6. COLLAPSIBLE TAGS (เหมือนหน้า Transactions) */}
              {tags && tags.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTagsSection((prev) => !prev)}
                    className="flex items-center gap-1.5 text-xs text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] cursor-pointer"
                  >
                    <TagIcon className="size-3.5" />
                    <span className="font-medium">แท็ก</span>
                    {selectedTagIds && selectedTagIds.length > 0 && (
                      <span className="rounded-full bg-[var(--pw-primary)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--pw-primary)]">
                        {selectedTagIds.length}
                      </span>
                    )}
                    <ChevronDown className={cn("size-3 transition-transform", showTagsSection && "rotate-180")} />
                  </button>

                  {showTagsSection && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {tags.map((t) => {
                        const checked = selectedTagIds.includes(t.tagId);
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
                              uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate && "pointer-events-none opacity-40",
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
                              disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
                              aria-label={`เลือกแท็ก ${t.tagName}`}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selectedTagIds, t.tagId]
                                  : selectedTagIds.filter((id) => id !== t.tagId);
                                setSelectedTagIds(next);
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
                                    : "border-white/60 bg-white/15 group-hover:border-white",
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

              {/* 7. COLLAPSIBLE DETECTED DETAILS (รหัสอ้างอิง, ผู้โอน, ธนาคาร) */}
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
                        {uploadedSlip.payerName || "-"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--pw-ink)]/50">รหัสอ้างอิง:</span>
                      <div className="font-medium text-[var(--pw-ink)] truncate">
                        {uploadedSlip.transactionReference || "-"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--pw-ink)]/50">ธนาคาร:</span>
                      <div className="font-medium text-[var(--pw-ink)] truncate">
                        {uploadedSlip.bankCode || "ตรวจจับอัตโนมัติ"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--pw-ink)]/50">ไฟล์ต้นฉบับ:</span>
                      <div className="font-medium text-[var(--pw-ink)] truncate">
                        {uploadedSlip.originalFileName}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 8. ACTION BUTTONS: ปุ่มยืนยันอยู่บน ปุ่มปฏิเสธอยู่ล่างบนมือถือ */}
              {uploadedSlip.reviewStatus !== "confirmed" &&
                uploadedSlip.reviewStatus !== "rejected" && (
                  <div className="flex flex-col gap-2.5 sm:flex-row-reverse sm:justify-start pt-3 border-t border-[var(--pw-hairline)]">
                    <Button
                      type="button"
                      className="w-full sm:w-auto h-11 gap-2 bg-[var(--pw-green)] text-[var(--pw-on-green)] hover:brightness-110 font-bold active:scale-[0.98] transition-transform shadow-md cursor-pointer"
                      disabled={confirmMutation.isPending || rejectMutation.isPending}
                      onClick={handleConfirm}
                    >
                      <Check className="size-4 stroke-[3]" />
                      <span>
                        {confirmMutation.isPending
                          ? "กำลังบันทึก..."
                          : "ยืนยันและบันทึกรายการ"}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full sm:w-auto gap-2 text-[var(--pw-accent-red)] hover:bg-[var(--pw-accent-red)]/10 active:scale-[0.98] transition-transform cursor-pointer"
                      disabled={rejectMutation.isPending || confirmMutation.isPending}
                      onClick={handleReject}
                    >
                      <X className="size-4" />
                      <span>ปฏิเสธสลิป</span>
                    </Button>
                  </div>
                )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

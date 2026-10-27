"use client";

import { useState, useRef, useEffect } from "react";
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
import { useCreditCards } from "@/features/credit-cards/hooks/useCreditCards";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useTags } from "@/features/tags/hooks/useTags";
import { useCategorySuggestion } from "@/features/categorization/hooks/useCategorization";
import {
  useUploadSlip,
  useConfirmSlip,
  useRejectSlip,
} from "@/features/imports/hooks/useImports";
import type { SlipImportResponse } from "@/types/import.types";
import { toast } from "sonner";
import { cn, getReadableTextColor, toThailandDateTimeInputValue, thailandDateTimeInputToUtcIso } from "@/lib/utils";

export function SlipImportTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedSlip, setUploadedSlip] = useState<SlipImportResponse | null>(null);

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

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedDescription(description ?? ""), 300);
    return () => window.clearTimeout(timeout);
  }, [description]);

  const { data: categorySuggestion } = useCategorySuggestion(
    debouncedDescription,
    Boolean(debouncedDescription && debouncedDescription.trim().length >= 2),
  );

  async function prepareSlipFile(file: File): Promise<File> {
    // Keep original high-resolution file for sharp OCR reading.
    // Only downscale if the file is extremely massive (> 5MB)
    const MAX_RAW_BYTES = 5 * 1024 * 1024;
    if (file.size <= MAX_RAW_BYTES || !file.type.startsWith("image/")) {
      return file;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxDim = 2500;
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim) {
          resolve(file);
          return;
        }

        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
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
        }, "image/jpeg", 0.92);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage(null);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    // Automatically trigger upload
    const formData = new FormData();
    const processedFile = await prepareSlipFile(file);
    formData.append("file", processedFile);

    uploadMutation.mutate(formData, {
      onSuccess: (data) => {
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
        if (bankAccounts.length > 0 && !bankAccountId) {
          setBankAccountId(String(bankAccounts[0].bankAccountId));
        }
      },
      onError: (err) => {
        setStatusMessage({
          type: "error",
          text: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลดสลิป",
        });
      },
    });
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
          description: description.trim() || (payeeName.trim() ? `ชำระเงินให้ ${payeeName.trim()}` : "โอนเงินผ่านสลิป"),
          categoryId: categoryId ? Number(categoryId) : null,
          bankAccountId: bankAccountId ? Number(bankAccountId) : null,
          creditCardId: creditCardId ? Number(creditCardId) : null,
          payeeName: payeeName.trim() || uploadedSlip.payeeName,
          payerName: uploadedSlip.payerName,
          transactionReference: uploadedSlip.transactionReference,
          tagIds: selectedTagIds,
        },
      },
      {
        onSuccess: () => {
          toast.success("ยืนยันและบันทึกรายการธุรกรรมเรียบร้อยแล้ว");
          setStatusMessage({
            type: "success",
            text: "ยืนยันและบันทึกรายการธุรกรรมเรียบร้อยแล้ว",
          });
          handleReset(true);
        },
        onError: (err) => {
          setStatusMessage({
            type: "error",
            text: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกรายการ",
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
    if (!keepStatusMessage) {
      setStatusMessage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
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

      {!uploadedSlip ? (
        <Card className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--pw-hairline)] bg-[var(--pw-surface-black)] p-8 text-center transition-colors hover:border-[var(--pw-accent-primary)]/50">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploadMutation.isPending}
          />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--pw-accent-primary)]/10 text-[var(--pw-accent-primary)] mb-4">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--pw-text-primary)]">
            อัปโหลดสลิปโอนเงิน
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--pw-text-secondary)]">
            ลากและวางรูปภาพสลิป หรือคลิกเพื่อเลือกไฟล์ รองรับ JPEG, PNG, WEBP หรือ PDF (สูงสุด 10 MB)
          </p>
          <Button
            type="button"
            className="mt-6 gap-2"
            disabled={uploadMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadMutation.isPending ? "กำลังอ่านข้อมูลสลิป..." : "เลือกไฟล์สลิป"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Slip Preview Column */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-4 bg-[var(--pw-surface-black)] border border-[var(--pw-hairline)]">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--pw-hairline)]">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--pw-text-primary)]">
                  <Receipt className="h-4 w-4 text-[var(--pw-accent-primary)]" />
                  <span>ตัวอย่างสลิป</span>
                </div>
                <span className="text-xs text-[var(--pw-text-muted)] truncate max-w-[180px]">
                  {uploadedSlip.originalFileName}
                </span>
              </div>

              {previewUrl ? (
                <div className="mt-4 flex justify-center rounded-lg overflow-hidden bg-black/40 border border-[var(--pw-hairline)] max-h-[420px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Slip Preview"
                    className="object-contain w-full max-h-[420px]"
                  />
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center py-12 text-center text-[var(--pw-text-muted)]">
                  <Receipt className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">ไฟล์เอกสาร PDF หรือไม่มีตัวอย่างรูปภาพ</p>
                </div>
              )}

              {uploadedSlip.isDuplicate && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-[var(--pw-accent-yellow)]/10 border border-[var(--pw-accent-yellow)]/20 p-3 text-xs text-[var(--pw-accent-yellow)]">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">ตรวจพบสลิปซ้ำในระบบ:</span>
                    <p className="mt-0.5 text-[var(--pw-text-secondary)]">
                      ไฟล์นี้มีค่าแฮช SHA-256 ตรงกับสลิปที่เคยนำเข้าแล้ว กรุณาตรวจสอบก่อนยืนยัน
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 text-[var(--pw-text-secondary)]"
              onClick={() => handleReset(false)}
            >
              <RotateCcw className="h-4 w-4" />
              อัปโหลดสลิปอื่น
            </Button>
          </div>

          {/* Form & Verification Column */}
          <div className="lg:col-span-7">
            <Card className="p-6 bg-[var(--pw-surface-black)] border border-[var(--pw-hairline)] space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--pw-hairline)]">
                <div>
                  <h3 className="text-base font-semibold text-[var(--pw-text-primary)]">
                    ตรวจสอบและยืนยันข้อมูลรายการ
                  </h3>
                  <p className="text-xs text-[var(--pw-text-secondary)]">
                    ข้อมูลถูกอ่านอัตโนมัติจากไฟล์สลิป สามารถแก้ไขก่อนบันทึกได้
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    uploadedSlip.reviewStatus === "confirmed"
                      ? "bg-[var(--pw-accent-green)]/10 text-[var(--pw-accent-green)]"
                      : uploadedSlip.reviewStatus === "rejected"
                      ? "bg-[var(--pw-accent-red)]/10 text-[var(--pw-accent-red)]"
                      : uploadedSlip.isDuplicate
                      ? "bg-[var(--pw-accent-yellow)]/10 text-[var(--pw-accent-yellow)]"
                      : "bg-[var(--pw-accent-primary)]/10 text-[var(--pw-accent-primary)]"
                  }`}
                >
                  {uploadedSlip.reviewStatus === "confirmed"
                    ? "บันทึกแล้ว"
                    : uploadedSlip.reviewStatus === "rejected"
                    ? "ปฏิเสธแล้ว"
                    : uploadedSlip.isDuplicate
                    ? "ตรวจพบซ้ำ"
                    : "รอตรวจสอบ"}
                </span>
              </div>

              {/* Detected info pills */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--pw-surface-indigo)]/50 p-3 rounded-lg border border-[var(--pw-hairline)]">
                <div>
                  <span className="text-[var(--pw-text-muted)]">ผู้รับเงิน / ร้านค้า:</span>
                  <div className="font-medium text-[var(--pw-text-primary)] truncate">
                    {uploadedSlip.payeeName || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--pw-text-muted)]">ผู้โอนเงิน:</span>
                  <div className="font-medium text-[var(--pw-text-primary)] truncate">
                    {uploadedSlip.payerName || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--pw-text-muted)]">รหัสอ้างอิง:</span>
                  <div className="font-medium text-[var(--pw-text-primary)] truncate">
                    {uploadedSlip.transactionReference || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--pw-text-muted)]">ธนาคาร:</span>
                  <div className="font-medium text-[var(--pw-text-primary)] truncate">
                    {uploadedSlip.bankCode || "ตรวจจับอัตโนมัติ"}
                  </div>
                </div>
              </div>

              {/* Edit Fields - matching TransactionForm for expenses */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="จำนวนเงิน (บาท)">
                    <NumberInput
                      step={0.01}
                      min={0.01}
                      placeholder="0"
                      value={amount}
                      disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </FormField>

                  <FormField label="วันที่และเวลา (ค.ศ. / เวลาไทย)">
                    <DateTimeInput
                      value={transactionDate}
                      disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
                      onChange={setTransactionDate}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label={
                      <div className="flex items-center gap-1.5">
                        <span>หมวดหมู่</span>
                        {uploadedSlip.suggestedCategoryName && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[var(--pw-accent-primary)] bg-[var(--pw-accent-primary)]/10 px-1.5 py-0.5 rounded">
                            <Sparkles className="h-3 w-3" />
                            แนะนำจากสลิป
                          </span>
                        )}
                      </div>
                    }
                  >
                    <Select
                      value={categoryId || "none"}
                      onValueChange={(val) => setCategoryId(val === "none" ? "" : val)}
                      disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="— ไม่ระบุ —" />
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
                    {categorySuggestion && String(categorySuggestion.categoryId) !== categoryId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-xs text-[var(--pw-accent-primary)] hover:text-[var(--pw-accent-primary)]/80 mt-1.5 flex items-center gap-1.5 px-2 py-1 h-auto"
                        onClick={() => setCategoryId(String(categorySuggestion.categoryId))}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>ใช้คำแนะนำจากรายละเอียด: <strong>{categorySuggestion.categoryName ?? "หมวดหมู่"}</strong></span>
                      </Button>
                    )}
                  </FormField>

                  <FormField label="บัญชี">
                    <Select
                      value={bankAccountId || "none"}
                      onValueChange={(val) => {
                        const nextVal = val === "none" ? "" : val;
                        setBankAccountId(nextVal);
                        if (nextVal) setCreditCardId("");
                      }}
                      disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="— ไม่ระบุ —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                        {bankAccounts.map((acc) => (
                          <SelectItem
                            key={acc.bankAccountId}
                            value={String(acc.bankAccountId)}
                          >
                            {acc.accountName} ({acc.bankName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="บัตรเครดิต">
                    <Select
                      value={creditCardId || "none"}
                      onValueChange={(val) => {
                        const nextVal = val === "none" ? "" : val;
                        setCreditCardId(nextVal);
                        if (nextVal) setBankAccountId("");
                      }}
                      disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="— ไม่ระบุ —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                        {creditCards
                          .filter((card) => card.isActive)
                          .map((card) => (
                            <SelectItem
                              key={card.creditCardId}
                              value={String(card.creditCardId)}
                            >
                              {card.cardName} · {card.bankName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
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

                <FormField label="แท็ก">
                  {!tags || tags.length === 0 ? (
                    <p className="pt-1 text-xs text-[var(--pw-ink)]/55">
                      ยังไม่มีแท็ก สามารถเพิ่มแท็กใหม่ได้ที่เมนู แท็ก
                    </p>
                  ) : (
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
                              "group inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:text-sm font-medium transition-all select-none shadow-xs",
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
                                "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-all",
                                checked
                                  ? isDarkText
                                    ? "bg-black text-white border-black"
                                    : "bg-white text-black border-white"
                                  : isDarkText
                                    ? "border-black/50 bg-black/10 group-hover:border-black/80"
                                    : "border-white/60 bg-white/15 group-hover:border-white",
                              )}
                            >
                              {checked && <Check className="size-3 stroke-[3]" />}
                            </span>
                            <span>#{t.tagName}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </FormField>

                <FormField label="รายละเอียด">
                  <Input
                    placeholder="เช่น ชำระค่าอาหาร, ค่ากาแฟ"
                    value={description}
                    disabled={uploadedSlip.reviewStatus !== "pending" && !uploadedSlip.isDuplicate}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </FormField>
              </div>

              {/* Action Buttons */}
              {uploadedSlip.reviewStatus !== "confirmed" &&
                uploadedSlip.reviewStatus !== "rejected" && (
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[var(--pw-hairline)]">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 text-[var(--pw-accent-red)] hover:bg-[var(--pw-accent-red)]/10"
                      disabled={rejectMutation.isPending || confirmMutation.isPending}
                      onClick={handleReject}
                    >
                      <X className="h-4 w-4" />
                      ปฏิเสธสลิป
                    </Button>
                    <Button
                      type="button"
                      className="gap-2 bg-[var(--pw-green)] text-[var(--pw-on-green)] hover:brightness-110"
                      disabled={confirmMutation.isPending || rejectMutation.isPending}
                      onClick={handleConfirm}
                    >
                      <Check className="h-4 w-4" />
                      {confirmMutation.isPending
                        ? "กำลังบันทึก..."
                        : "ยืนยันและบันทึกรายการ"}
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

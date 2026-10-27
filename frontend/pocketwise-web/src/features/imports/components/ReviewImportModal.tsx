"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Check,
  X,
  LoaderCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { FormField } from "@/components/ui/form-field";
import { DateTimeInput } from "@/components/ui/date-input";
import { Checkbox } from "@/components/ui/checkbox";
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
  useSlip,
  useConfirmSlip,
  useRejectSlip,
  useStatementById,
  useConfirmStatementItemsById,
} from "@/features/imports/hooks/useImports";
import type { ImportJobResponse } from "@/types/import.types";
import {
  cn,
  getReadableTextColor,
  toThailandDateTimeInputValue,
  thailandDateTimeInputToUtcIso,
  formatCurrency,
  formatDate,
} from "@/lib/utils";
import { toast } from "sonner";

interface ReviewImportModalProps {
  job: ImportJobResponse | null;
  onClose: () => void;
}

export function ReviewImportModal({ job, onClose }: ReviewImportModalProps) {
  const isOpen = job !== null;
  const isSlip = job?.importType?.toLowerCase() === "slip";
  const isStatement =
    job?.importType?.toLowerCase() === "cardstatement" ||
    job?.importType?.toLowerCase() === "creditcardstatement";

  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        isSlip
          ? `ตรวจสอบสลิป: ${job?.fileName ?? ""}`
          : `ตรวจสอบใบแจ้งยอด: ${job?.fileName ?? ""}`
      }
      description="ตรวจสอบข้อมูลและเลือกหมวดหมู่ให้ถูกต้องก่อนยืนยันบันทึกลงในรายการธุรกรรม"
      className="sm:max-w-3xl"
    >
      <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
        {isSlip && job?.slipId && (
          <SlipReviewContent slipId={job.slipId} onClose={onClose} />
        )}
        {isStatement && job?.statementId && (
          <StatementReviewContent
            statementId={job.statementId}
            onClose={onClose}
          />
        )}
        {(!job?.slipId && isSlip) || (!job?.statementId && isStatement) ? (
          <div className="py-8 text-center text-[var(--pw-ink)]/60 text-sm">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p>ไม่พบข้อมูลรายละเอียดของงานนำเข้านี้ หรือข้อมูลยังประมวลผลไม่เสร็จ</p>
          </div>
        ) : null}
      </div>
    </BottomSheet>
  );
}

function SlipReviewContent({
  slipId,
  onClose,
}: {
  slipId: number;
  onClose: () => void;
}) {
  const { data: slip, isLoading } = useSlip(slipId);
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: creditCards = [] } = useCreditCards();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const confirmMutation = useConfirmSlip();
  const rejectMutation = useRejectSlip();

  const [amount, setAmount] = useState<string>("");
  const [transactionDate, setTransactionDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [payeeName, setPayeeName] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [creditCardId, setCreditCardId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [debouncedDescription, setDebouncedDescription] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedDescription(description ?? ""), 300);
    return () => window.clearTimeout(timeout);
  }, [description]);

  const { data: categorySuggestion } = useCategorySuggestion(
    debouncedDescription,
    Boolean(debouncedDescription && debouncedDescription.trim().length >= 2),
  );

  useEffect(() => {
    if (slip) {
      if (slip.detectedAmount) {
        setAmount(String(slip.detectedAmount));
      }
      if (slip.detectedAt) {
        try {
          setTransactionDate(toThailandDateTimeInputValue(slip.detectedAt));
        } catch {
          setTransactionDate(toThailandDateTimeInputValue(new Date()));
        }
      } else {
        setTransactionDate(toThailandDateTimeInputValue(new Date()));
      }
      setPayeeName(slip.payeeName ?? "");
      setCreditCardId("");
      if (slip.payeeName) {
        setDescription(`โอนเงินให้ ${slip.payeeName}`);
      } else if (slip.payerName) {
        setDescription(`รับเงินจาก ${slip.payerName}`);
      } else {
        setDescription(slip.originalFileName || "รายการจากสลิป");
      }
      if (slip.suggestedCategoryId) {
        setCategoryId(String(slip.suggestedCategoryId));
      }
      if (bankAccounts.length > 0 && !bankAccountId) {
        setBankAccountId(String(bankAccounts[0].bankAccountId));
      }
    }
  }, [slip, bankAccounts]);

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
        </div>
        <div className="space-y-1.5"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
        <div className="flex justify-end gap-2 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    );
  }

  if (!slip) {
    return (
      <div className="py-8 text-center text-sm text-red-400">
        ไม่พบข้อมูลสลิปที่ระบุ
      </div>
    );
  }

  const handleConfirm = () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }

    let isoDate: string;
    try {
      isoDate = thailandDateTimeInputToUtcIso(transactionDate);
    } catch {
      toast.error("รูปแบบวันที่และเวลาไม่ถูกต้อง");
      return;
    }

    confirmMutation.mutate(
      {
        slipImportFileId: slipId,
        body: {
          amount: numericAmount,
          transactionDate: isoDate,
          description: description.trim() || (payeeName.trim() ? `ชำระเงินให้ ${payeeName.trim()}` : "รายการจากสลิป"),
          categoryId: categoryId ? Number(categoryId) : null,
          bankAccountId: bankAccountId ? Number(bankAccountId) : null,
          creditCardId: creditCardId ? Number(creditCardId) : null,
          payeeName: payeeName.trim() || slip.payeeName,
          payerName: slip.payerName,
          transactionReference: slip.transactionReference,
          tagIds: selectedTagIds,
        },
      },
      {
        onSuccess: () => {
          toast.success("ยืนยันรายการสลิปเรียบร้อยแล้ว รายการถูกบันทึกลงในธุรกรรมแล้ว");
          onClose();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการยืนยันรายการ");
        },
      },
    );
  };

  const handleReject = () => {
    rejectMutation.mutate(slipId, {
      onSuccess: () => {
        toast.info("ปฏิเสธสลิปเรียบร้อยแล้ว");
        onClose();
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการปฏิเสธสลิป");
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Duplicate warning */}
      {slip.isDuplicate && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>ระบบตรวจพบว่าสลิปนี้อาจเป็นสลิปซ้ำกับที่มีอยู่ในระบบ</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Slip preview image */}
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-black/20 border border-[var(--pw-hairline)] min-h-[220px]">
          <img
            src={`/api/v1/imports/slips/${slipId}/image`}
            alt="สลิปโอนเงิน"
            className="max-h-60 rounded-xl object-contain shadow-md"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <p className="mt-2 text-[11px] text-[var(--pw-ink)]/50">
            {slip.originalFileName}
          </p>
        </div>

        {/* Details & Form - matching TransactionForm for expenses */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="จำนวนเงิน (บาท)" htmlFor="review-amount">
              <NumberInput
                id="review-amount"
                min={0.01}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </FormField>

            <FormField label="วันที่และเวลา (ค.ศ. / เวลาไทย)" htmlFor="review-date">
              <DateTimeInput
                id="review-date"
                value={transactionDate}
                onChange={setTransactionDate}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={
                <div className="flex items-center gap-1.5">
                  <span>หมวดหมู่</span>
                  {slip.suggestedCategoryName && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--pw-accent-primary)] bg-[var(--pw-accent-primary)]/10 px-1.5 py-0.5 rounded">
                      <Sparkles className="h-3 w-3" />
                      แนะนำจากสลิป
                    </span>
                  )}
                </div>
              }
              htmlFor="review-category"
            >
              <Select
                value={categoryId || "none"}
                onValueChange={(val) => setCategoryId(val === "none" ? "" : val)}
              >
                <SelectTrigger id="review-category" className="w-full">
                  <SelectValue placeholder="— ไม่ระบุ —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                      {c.categoryName}
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

            <FormField label="บัญชี" htmlFor="review-bank">
              <Select
                value={bankAccountId || "none"}
                onValueChange={(val) => {
                  const nextVal = val === "none" ? "" : val;
                  setBankAccountId(nextVal);
                  if (nextVal) setCreditCardId("");
                }}
              >
                <SelectTrigger id="review-bank" className="w-full">
                  <SelectValue placeholder="— ไม่ระบุ —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                  {bankAccounts.map((b) => (
                    <SelectItem key={b.bankAccountId} value={String(b.bankAccountId)}>
                      {b.accountName} ({b.bankName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="บัตรเครดิต" htmlFor="review-credit-card">
              <Select
                value={creditCardId || "none"}
                onValueChange={(val) => {
                  const nextVal = val === "none" ? "" : val;
                  setCreditCardId(nextVal);
                  if (nextVal) setBankAccountId("");
                }}
              >
                <SelectTrigger id="review-credit-card" className="w-full">
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

            <FormField label="ผู้รับเงิน / ร้านค้า" htmlFor="review-payee">
              <Input
                id="review-payee"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="เช่น บจก. ซีพี ออลล์, ร้านกาแฟ"
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

          <FormField label="รายละเอียด" htmlFor="review-desc">
            <Input
              id="review-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น ซื้อของเซเว่น, โอนให้เพื่อน"
            />
          </FormField>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-3 border-t border-[var(--pw-hairline)] sm:flex-row-reverse sm:justify-start">
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={confirmMutation.isPending || rejectMutation.isPending}
          className="w-full sm:w-auto bg-[var(--pw-green)] text-[var(--pw-on-green)] hover:brightness-110"
        >
          {confirmMutation.isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          ยืนยันและบันทึกรายการ
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReject}
          disabled={rejectMutation.isPending || confirmMutation.isPending}
          className="w-full sm:w-auto text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          {rejectMutation.isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          ปฏิเสธสลิปนี้
        </Button>
      </div>
    </div>
  );
}

function StatementReviewContent({
  statementId,
  onClose,
}: {
  statementId: number;
  onClose: () => void;
}) {
  const { data: statement, isLoading } = useStatementById(statementId);
  const { data: categories = [] } = useCategories();
  const confirmMutation = useConfirmStatementItemsById(statementId);

  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [itemCategories, setItemCategories] = useState<Record<number, number>>({});
  const [itemDescriptions, setItemDescriptions] = useState<Record<number, string>>({});

  useEffect(() => {
    if (statement?.items) {
      const initialSelected = new Set<number>();
      const initialCats: Record<number, number> = {};
      const initialDescs: Record<number, string> = {};

      statement.items.forEach((item) => {
        if (!item.isDuplicate && !item.isLinked) {
          initialSelected.add(item.statementItemId);
        }
        if (item.suggestedCategoryId) {
          initialCats[item.statementItemId] = item.suggestedCategoryId;
        }
        initialDescs[item.statementItemId] = item.description;
      });

      setSelectedItemIds(initialSelected);
      setItemCategories(initialCats);
      setItemDescriptions(initialDescs);
    }
  }, [statement]);

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/30">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="py-8 text-center text-sm text-red-400">
        ไม่พบข้อมูลใบแจ้งยอดที่ระบุ
      </div>
    );
  }

  const items = statement.items || [];
  const selectableItems = items.filter((i) => !i.isLinked);
  const isAllSelected =
    selectableItems.length > 0 &&
    selectableItems.every((i) => selectedItemIds.has(i.statementItemId));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds(new Set());
    } else {
      const all = new Set<number>();
      selectableItems.forEach((i) => all.add(i.statementItemId));
      setSelectedItemIds(all);
    }
  };

  const toggleSelectItem = (id: number) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedItemIds.size === 0) {
      toast.error("กรุณาเลือกอย่างน้อย 1 รายการเพื่อบันทึก");
      return;
    }

    const payload = {
      items: Array.from(selectedItemIds).map((id) => ({
        statementItemId: id,
        categoryId: itemCategories[id] ? Number(itemCategories[id]) : null,
        description: itemDescriptions[id],
      })),
    };

    confirmMutation.mutate(payload, {
      onSuccess: (res) => {
        toast.success(`บันทึกรายการสำเร็จ ${res.confirmedCount} รายการ`);
        onClose();
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกรายการ");
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--pw-hairline)] text-xs text-[var(--pw-text-muted)]">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={toggleSelectAll}
            disabled={selectableItems.length === 0}
          />
          <span>เลือกทั้งหมดที่ยังไม่ได้นำเข้า ({selectableItems.length} รายการ)</span>
        </label>
        <span>
          เลือกแล้ว <strong className="text-[var(--pw-primary)]">{selectedItemIds.size}</strong> รายการ
        </span>
      </div>

      {/* Items list */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--pw-text-muted)]">
            ไม่พบรายการในใบแจ้งยอดนี้
          </p>
        ) : (
          items.map((item) => {
            const isSelected = selectedItemIds.has(item.statementItemId);

            return (
              <div
                key={item.statementItemId}
                className={cn(
                  "p-3 rounded-xl border text-xs transition-colors",
                  item.isLinked
                    ? "bg-[var(--pw-surface-indigo)]/10 border-[var(--pw-hairline)] opacity-60"
                    : item.isDuplicate
                    ? "bg-amber-500/5 border-amber-500/20"
                    : isSelected
                    ? "bg-[var(--pw-primary)]/5 border-[var(--pw-primary)]/40"
                    : "bg-[var(--pw-surface-indigo)]/30 border-[var(--pw-hairline)] hover:border-[var(--pw-primary)]/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    disabled={item.isLinked}
                    onCheckedChange={() => toggleSelectItem(item.statementItemId)}
                    className="mt-0.5"
                  />

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--pw-text-primary)] truncate max-w-sm">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--pw-text-muted)]">
                          <span>{formatDate(item.transactionDate)}</span>
                          {item.isLinked ? (
                            <span className="text-[var(--pw-accent-green)] font-medium">
                              (บันทึกแล้ว)
                            </span>
                          ) : item.isDuplicate ? (
                            <span className="text-amber-500 font-medium">
                              (อาจซ้ำในระบบ)
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <span className="font-semibold text-sm text-[var(--pw-text-primary)] shrink-0">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>

                    {!item.isLinked && isSelected && (
                      <div className="pt-1">
                        <Select
                          value={
                            itemCategories[item.statementItemId]
                              ? String(itemCategories[item.statementItemId])
                              : ""
                          }
                          onValueChange={(val) =>
                            setItemCategories((prev) => ({
                              ...prev,
                              [item.statementItemId]: Number(val),
                            }))
                          }
                        >
                          <SelectTrigger className="h-7 text-[11px]">
                            <SelectValue placeholder="เลือกหมวดหมู่..." />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem
                                key={c.categoryId}
                                value={String(c.categoryId)}
                                className="text-xs"
                              >
                                {c.categoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-3 border-t border-[var(--pw-hairline)] sm:flex-row-reverse sm:justify-start">
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={confirmMutation.isPending || selectedItemIds.size === 0}
          className="w-full sm:w-auto bg-[var(--pw-primary)] text-[var(--pw-primary-foreground)] hover:opacity-90"
        >
          {confirmMutation.isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          ยืนยันที่เลือก ({selectedItemIds.size} รายการ)
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
          ปิด
        </Button>
      </div>
    </div>
  );
}

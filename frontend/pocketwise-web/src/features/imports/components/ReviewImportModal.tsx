"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  X,
  LoaderCircle,
  ExternalLink,
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
import { useCategories } from "@/features/categories/hooks/useCategories";
import {
  useSlip,
  useConfirmSlip,
  useRejectSlip,
  useStatementById,
  useConfirmStatementItemsById,
} from "@/features/imports/hooks/useImports";
import type { ImportJobResponse } from "@/types/import.types";
import {
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
  const { data: categories = [] } = useCategories();

  const confirmMutation = useConfirmSlip();
  const rejectMutation = useRejectSlip();

  const [amount, setAmount] = useState<string>("");
  const [transactionDate, setTransactionDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");

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
    }
  }, [slip]);

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
          description: description || "รายการจากสลิป",
          categoryId: categoryId ? Number(categoryId) : null,
          bankAccountId: bankAccountId ? Number(bankAccountId) : null,
          payeeName: slip.payeeName,
          payerName: slip.payerName,
          transactionReference: slip.transactionReference,
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

        {/* Details & Form */}
        <div className="space-y-3">
          <FormField label="จำนวนเงิน (บาท)" htmlFor="review-amount">
            <NumberInput
              id="review-amount"
              min={0.01}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </FormField>

          <FormField label="วันที่และเวลา" htmlFor="review-date">
            <DateTimeInput
              id="review-date"
              value={transactionDate}
              onChange={setTransactionDate}
            />
          </FormField>

          <FormField label="คำอธิบาย / รายละเอียด" htmlFor="review-desc">
            <Input
              id="review-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น ซื้อของเซเว่น, โอนให้เพื่อน"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="หมวดหมู่" htmlFor="review-category">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="review-category">
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                      {c.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="ตัดจากบัญชีธนาคาร" htmlFor="review-bank">
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger id="review-bank">
                  <SelectValue placeholder="เลือกบัญชี" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((b) => (
                    <SelectItem key={b.bankAccountId} value={String(b.bankAccountId)}>
                      {b.accountName} ({b.bankName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-3 border-t border-[var(--pw-hairline)] sm:flex-row-reverse sm:justify-start">
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={confirmMutation.isPending || rejectMutation.isPending}
          className="w-full sm:w-auto bg-[var(--pw-primary)] text-[var(--pw-primary-foreground)] hover:opacity-90"
        >
          {confirmMutation.isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
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
            <Skeleton className="size-5 rounded" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
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

  const toggleSelectAll = () => {
    if (selectedItemIds.size === selectableItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(selectableItems.map((i) => i.statementItemId)));
    }
  };

  const toggleItem = (itemId: number) => {
    const next = new Set(selectedItemIds);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelectedItemIds(next);
  };

  const handleConfirm = () => {
    if (selectedItemIds.size === 0) {
      toast.error("กรุณาเลือกรายการอย่างน้อย 1 รายการเพื่อบันทึก");
      return;
    }

    const payloadItems = Array.from(selectedItemIds).map((id) => ({
      statementItemId: id,
      categoryId: itemCategories[id] ?? null,
      description: itemDescriptions[id] ?? null,
    }));

    confirmMutation.mutate(
      { items: payloadItems },
      {
        onSuccess: (data) => {
          toast.success(
            `ยืนยันเรียบร้อยแล้ว บันทึกธุรกรรมใหม่จำนวน ${data.confirmedCount} รายการ`,
          );
          onClose();
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการยืนยันรายการ",
          );
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Statement Summary Card */}
      <div className="p-3.5 rounded-2xl bg-[var(--pw-surface-indigo)]/50 border border-[var(--pw-hairline)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-[var(--pw-ink)]/60">บัตร: </span>
          <span className="font-semibold">{statement.cardName || "บัตรเครดิต"}</span>
        </div>
        <div>
          <span className="text-[var(--pw-ink)]/60">รอบบัญชี: </span>
          <span>{formatDate(statement.statementPeriodStart)} - {formatDate(statement.statementPeriodEnd)}</span>
        </div>
        <div>
          <span className="text-[var(--pw-ink)]/60">ยอดรวม: </span>
          <span className="font-semibold text-[var(--pw-primary)]">
            {formatCurrency(statement.totalDue)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between text-xs pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={
              selectableItems.length > 0 &&
              selectedItemIds.size === selectableItems.length
            }
            onCheckedChange={toggleSelectAll}
          />
          <span className="font-medium">
            เลือกทั้งหมด ({selectedItemIds.size}/{selectableItems.length})
          </span>
        </label>
      </div>

      {/* Items list */}
      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--pw-ink)]/50">
            ไม่มีรายการในใบแจ้งยอดนี้
          </p>
        ) : (
          items.map((item) => {
            const isSelected = selectedItemIds.has(item.statementItemId);
            const isPayment =
              item.itemType === "payment" || item.itemType === "cashback";

            return (
              <div
                key={item.statementItemId}
                className={`p-3 rounded-xl border text-xs transition-colors ${
                  item.isLinked
                    ? "bg-black/10 border-[var(--pw-hairline)]/40 opacity-50"
                    : isSelected
                    ? "bg-[var(--pw-primary)]/10 border-[var(--pw-primary)]/30"
                    : "bg-[var(--pw-surface-indigo)]/30 border-[var(--pw-hairline)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    <Checkbox
                      checked={isSelected}
                      disabled={item.isLinked}
                      onCheckedChange={() => toggleItem(item.statementItemId)}
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <input
                          type="text"
                          value={itemDescriptions[item.statementItemId] ?? item.description}
                          onChange={(e) =>
                            setItemDescriptions((prev) => ({
                              ...prev,
                              [item.statementItemId]: e.target.value,
                            }))
                          }
                          disabled={item.isLinked}
                          className="bg-transparent border-b border-transparent hover:border-[var(--pw-hairline)] focus:border-[var(--pw-primary)] focus:outline-none w-full font-medium truncate"
                        />
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--pw-ink)]/60">
                          <span>{formatDate(item.transactionDate)}</span>
                          {item.isDuplicate && (
                            <span className="text-amber-500 font-medium">● รายการซ้ำ</span>
                          )}
                          {item.isLinked && (
                            <span className="text-emerald-400 font-medium">✓ บันทึกแล้ว</span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`font-semibold shrink-0 ${
                          isPayment ? "text-emerald-400" : "text-[var(--pw-ink)]"
                        }`}
                      >
                        {isPayment ? "-" : "+"}
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

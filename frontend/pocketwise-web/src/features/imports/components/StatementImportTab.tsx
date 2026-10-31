"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  CreditCard,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreditCards } from "@/features/credit-cards/hooks/useCreditCards";
import { useCategories } from "@/features/categories/hooks/useCategories";
import {
  useUploadStatement,
  useConfirmStatementItems,
} from "@/features/imports/hooks/useImports";
import type {
  CreditCardStatementImportResponse,
  ConfirmStatementItemDto,
} from "@/types/import.types";

export function StatementImportTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [showSampleFormat, setShowSampleFormat] = useState(false);
  const [statementData, setStatementData] =
    useState<CreditCardStatementImportResponse | null>(null);

  // Item selections & category overrides
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [itemCategories, setItemCategories] = useState<Record<number, number>>({});
  const [itemDescriptions, setItemDescriptions] = useState<Record<number, string>>({});
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { data: creditCards = [] } = useCreditCards();
  const { data: categories = [] } = useCategories();

  const uploadMutation = useUploadStatement(Number(selectedCardId));
  const confirmMutation = useConfirmStatementItems(
    Number(selectedCardId),
    statementData?.statementId ?? 0,
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCardId) return;

    setStatusMessage(null);
    const formData = new FormData();
    formData.append("file", file);

    uploadMutation.mutate(formData, {
      onSuccess: (data) => {
        setStatementData(data);
        // Pre-select non-duplicate, unlinked items by default
        const initialSelected = new Set<number>();
        const initialCats: Record<number, number> = {};
        const initialDescs: Record<number, string> = {};

        data.items.forEach((item) => {
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
      },
      onError: (err) => {
        setStatusMessage({
          type: "error",
          text: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลดใบแจ้งยอด",
        });
      },
    });
  };

  const toggleItemSelection = (statementItemId: number) => {
    const next = new Set(selectedItemIds);
    if (next.has(statementItemId)) {
      next.delete(statementItemId);
    } else {
      next.add(statementItemId);
    }
    setSelectedItemIds(next);
  };

  const toggleSelectAll = () => {
    if (!statementData) return;
    const unlinkedItems = statementData.items.filter((i) => !i.isLinked);
    if (selectedItemIds.size === unlinkedItems.length) {
      setSelectedItemIds(new Set());
    } else {
      const allIds = new Set(unlinkedItems.map((i) => i.statementItemId));
      setSelectedItemIds(allIds);
    }
  };

  const handleBatchConfirm = () => {
    if (!statementData || selectedItemIds.size === 0) return;

    const itemsToConfirm: ConfirmStatementItemDto[] = Array.from(selectedItemIds).map(
      (id) => ({
        statementItemId: id,
        categoryId: itemCategories[id] ?? null,
        description: itemDescriptions[id]?.trim() || undefined,
      }),
    );

    confirmMutation.mutate(
      { items: itemsToConfirm },
      {
        onSuccess: (res) => {
          setStatusMessage({
            type: "success",
            text: `ยืนยันและสร้างรายการธุรกรรมสำเร็จ ${res.confirmedCount} รายการ`,
          });
          // Update statement items state to reflect confirmed transactions
          setStatementData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              items: prev.items.map((i) =>
                selectedItemIds.has(i.statementItemId)
                  ? { ...i, isLinked: true }
                  : i,
              ),
            };
          });
          setSelectedItemIds(new Set());
        },
        onError: (err) => {
          setStatusMessage({
            type: "error",
            text: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการยืนยันรายการ",
          });
        },
      },
    );
  };

  const handleReset = () => {
    setStatementData(null);
    setSelectedItemIds(new Set());
    setItemCategories({});
    setItemDescriptions({});
    setStatusMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = `# statement_date: 2026-10-15
# period_start: 2026-09-16
# period_end: 2026-10-15
# due_date: 2026-11-05
date,description,amount,type,ref
2026-10-01,Starbucks Cafe,150.00,purchase,TXN001
2026-10-05,Monthly Cashback,50.00,cashback,TXN002
2026-10-08,Grab Food Delivery,320.00,purchase,TXN003
2026-10-12,BTS Ticket,65.00,purchase,TXN004
2026-10-14,Shopee Online,890.00,purchase,TXN005
`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_statement.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadSampleJson = () => {
    const jsonContent = JSON.stringify(
      {
        statementDate: "2026-10-15",
        statementPeriodStart: "2026-09-16",
        statementPeriodEnd: "2026-10-15",
        paymentDueDate: "2026-11-05",
        previousBalance: 5000.0,
        purchaseAmount: 1475.0,
        totalDue: 1475.0,
        items: [
          { transactionDate: "2026-10-01", description: "Starbucks Cafe", amount: 150.0, itemType: "Purchase", externalReference: "TXN001" },
          { transactionDate: "2026-10-05", description: "Monthly Cashback", amount: 50.0, itemType: "Cashback", externalReference: "TXN002" },
          { transactionDate: "2026-10-08", description: "Grab Food Delivery", amount: 320.0, itemType: "Purchase", externalReference: "TXN003" },
          { transactionDate: "2026-10-12", description: "BTS Ticket", amount: 65.0, itemType: "Purchase", externalReference: "TXN004" },
          { transactionDate: "2026-10-14", description: "Shopee Online", amount: 890.0, itemType: "Purchase", externalReference: "TXN005" }
        ]
      },
      null,
      2
    );
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_statement.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

      {/* Card Selection and Sample format */}
      <Card className="p-5 bg-[var(--pw-surface-black)] border border-[var(--pw-hairline)] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <FormField label="เลือกบัตรเครดิตที่ต้องการนำเข้าใบแจ้งยอด">
            <Select
              value={selectedCardId}
              onValueChange={(val) => {
                setSelectedCardId(val);
                handleReset();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- กรุณาเลือกบัตรเครดิต --" />
              </SelectTrigger>
              <SelectContent>
                {creditCards.map((card) => (
                  <SelectItem key={card.creditCardId} value={String(card.creditCardId)}>
                    {card.cardName} (•••• {card.cardNumberMasked?.slice(-4) || "0000"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="flex flex-wrap items-center justify-end gap-2 md:mt-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-[var(--pw-primary)] border-[var(--pw-primary)]/40 hover:bg-[var(--pw-primary)]/10 active:scale-95 transition-all"
              onClick={downloadSampleCsv}
            >
              <FileSpreadsheet className="size-3.5" />
              โหลด Template CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-[var(--pw-ink)]/80 hover:bg-[var(--pw-surface-onyx)] active:scale-95 transition-all"
              onClick={downloadSampleJson}
            >
              <FileCode className="size-3.5" />
              โหลด Template JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-[var(--pw-text-secondary)]"
              onClick={() => setShowSampleFormat(!showSampleFormat)}
            >
              <Info className="h-3.5 w-3.5 text-[var(--pw-accent-primary)]" />
              {showSampleFormat ? "ซ่อนตัวอย่างรูปแบบไฟล์" : "ดูตัวอย่างไฟล์ CSV / JSON"}
              {showSampleFormat ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Collapsible Format Sample */}
        {showSampleFormat && (
          <div className="rounded-lg bg-[var(--pw-surface-indigo)]/40 p-4 border border-[var(--pw-hairline)] text-xs space-y-3">
            <div className="font-semibold text-[var(--pw-text-primary)]">
              รูปแบบไฟล์ที่รองรับ (CSV หรือ JSON):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
              <div className="space-y-1">
                <div className="font-sans font-medium text-[var(--pw-accent-primary)]">
                  ตัวอย่างไฟล์ CSV (.csv):
                </div>
                <pre className="p-2.5 rounded bg-black/50 text-[var(--pw-text-secondary)] overflow-x-auto whitespace-pre">
{`# statement_date: 2026-10-15
# period_start: 2026-09-16
# period_end: 2026-10-15
# due_date: 2026-11-05
date,description,amount,type,ref
2026-10-01,Starbucks,150.00,purchase,TXN001
2026-10-05,Monthly Cashback,50.00,cashback,TXN002`}
                </pre>
              </div>

              <div className="space-y-1">
                <div className="font-sans font-medium text-[var(--pw-accent-primary)]">
                  ตัวอย่างไฟล์ JSON (.json):
                </div>
                <pre className="p-2.5 rounded bg-black/50 text-[var(--pw-text-secondary)] overflow-x-auto whitespace-pre">
{`{
  "statementDate": "2026-10-15",
  "statementPeriodStart": "2026-09-16",
  "statementPeriodEnd": "2026-10-15",
  "paymentDueDate": "2026-11-05",
  "items": [
    { "transactionDate": "2026-10-01", "description": "Starbucks", "amount": 150, "itemType": "Purchase" }
  ]
}`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Card>

      {!statementData ? (
        <Card className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--pw-hairline)] bg-[var(--pw-surface-black)] p-8 text-center transition-colors hover:border-[var(--pw-accent-primary)]/50">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/json,.json"
            className="hidden"
            onChange={handleFileChange}
            disabled={!selectedCardId || uploadMutation.isPending}
          />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--pw-accent-primary)]/10 text-[var(--pw-accent-primary)] mb-4">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--pw-text-primary)]">
            อัปโหลดใบแจ้งยอดบัตรเครดิต
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--pw-text-secondary)]">
            {selectedCardId
              ? "รองรับไฟล์รูปแบบ CSV หรือ JSON จากแอปธนาคารหรือธนาคารผู้ให้บริการ"
              : "กรุณาเลือกบัตรเครดิตด้านบนก่อนเพื่อดำเนินการอัปโหลด"}
          </p>
          <Button
            type="button"
            className="mt-6 gap-2"
            disabled={!selectedCardId || uploadMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadMutation.isPending ? "กำลังวิเคราะห์ใบแจ้งยอด..." : "เลือกไฟล์ใบแจ้งยอด"}
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Statement Header Card */}
          <Card className="p-5 bg-[var(--pw-surface-black)] border border-[var(--pw-hairline)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[var(--pw-hairline)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pw-accent-primary)]/10 text-[var(--pw-accent-primary)]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--pw-text-primary)]">
                    ใบแจ้งยอด: {statementData.cardName || "บัตรเครดิต"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[var(--pw-text-secondary)]">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      รอบบัญชี: {statementData.statementPeriodStart} ถึง {statementData.statementPeriodEnd}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-[var(--pw-text-secondary)]"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  นำเข้าไฟล์อื่น
                </Button>
              </div>
            </div>

            {/* Financial Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[var(--pw-surface-indigo)]/40 border border-[var(--pw-hairline)]">
                <span className="text-[var(--pw-text-muted)]">ยอดเรียกเก็บรวม</span>
                <div className="text-base font-bold text-[var(--pw-text-primary)] mt-1">
                  ฿{statementData.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--pw-surface-indigo)]/40 border border-[var(--pw-hairline)]">
                <span className="text-[var(--pw-text-muted)]">ยอดซื้อ/ชำระสินค้า</span>
                <div className="text-base font-bold text-[var(--pw-accent-red)] mt-1">
                  ฿{statementData.purchaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--pw-surface-indigo)]/40 border border-[var(--pw-hairline)]">
                <span className="text-[var(--pw-text-muted)]">เครดิตเงินคืน / ชำระ</span>
                <div className="text-base font-bold text-[var(--pw-accent-green)] mt-1">
                  ฿{(statementData.cashbackAmount + statementData.paymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--pw-surface-indigo)]/40 border border-[var(--pw-hairline)]">
                <span className="text-[var(--pw-text-muted)]">วันครบกำหนดชำระ</span>
                <div className="text-base font-bold text-[var(--pw-accent-yellow)] mt-1">
                  {statementData.paymentDueDate || "-"}
                </div>
              </div>
            </div>

            {/* Counters */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--pw-surface-indigo)] text-[var(--pw-text-primary)] border border-[var(--pw-hairline)]">
                <Layers className="h-3.5 w-3.5 text-[var(--pw-accent-primary)]" />
                รายการทั้งหมด: {statementData.totalItems} รายการ
              </span>
              {statementData.duplicateItems > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--pw-accent-yellow)]/10 text-[var(--pw-accent-yellow)] border border-[var(--pw-accent-yellow)]/20">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  พบรายการซ้ำ: {statementData.duplicateItems} รายการ
                </span>
              )}
            </div>
          </Card>

          {/* Items Review Table */}
          <Card className="p-5 bg-[var(--pw-surface-black)] border border-[var(--pw-hairline)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[var(--pw-hairline)]">
              <div>
                <h4 className="text-sm font-semibold text-[var(--pw-text-primary)]">
                  ตรวจสอบรายการในใบแจ้งยอด
                </h4>
                <p className="text-xs text-[var(--pw-text-secondary)]">
                  เลือกรายการที่ต้องการบันทึกเป็นธุรกรรม และตรวจสอบหมวดหมู่ที่แนะนำ
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={toggleSelectAll}
                >
                  {selectedItemIds.size === statementData.items.filter((i) => !i.isLinked).length
                    ? "ยกเลิกการเลือกทั้งหมด"
                    : "เลือกทั้งหมด"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  className="gap-2 bg-[var(--pw-green)] text-[var(--pw-on-green)] hover:brightness-110"
                  disabled={selectedItemIds.size === 0 || confirmMutation.isPending}
                  onClick={handleBatchConfirm}
                >
                  <Check className="h-4 w-4" />
                  {confirmMutation.isPending
                    ? "กำลังบันทึก..."
                    : `ยืนยันรายการที่เลือก (${selectedItemIds.size})`}
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--pw-hairline)] text-[var(--pw-text-muted)]">
                    <th className="py-2.5 px-3 w-10 text-center">เลือก</th>
                    <th className="py-2.5 px-3">วันที่</th>
                    <th className="py-2.5 px-3">รายละเอียด / ร้านค้า</th>
                    <th className="py-2.5 px-3">ประเภท</th>
                    <th className="py-2.5 px-3 text-right">จำนวนเงิน</th>
                    <th className="py-2.5 px-3 min-w-[180px]">หมวดหมู่แนะนำ</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--pw-hairline)]">
                  {statementData.items.map((item) => {
                    const isSelected = selectedItemIds.has(item.statementItemId);
                    const isCredit =
                      item.itemType.toLowerCase() === "cashback" ||
                      item.itemType.toLowerCase() === "payment";

                    return (
                      <tr
                        key={item.statementItemId}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-[var(--pw-accent-primary)]/5"
                            : item.isDuplicate
                            ? "bg-[var(--pw-accent-yellow)]/5"
                            : "hover:bg-[var(--pw-surface-indigo)]/30"
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <Checkbox
                            checked={isSelected}
                            disabled={item.isLinked}
                            onCheckedChange={() => toggleItemSelection(item.statementItemId)}
                            aria-label={`เลือกรายการวันที่ ${item.transactionDate}`}
                          />
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[var(--pw-text-primary)] whitespace-nowrap">
                          {item.transactionDate}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--pw-text-primary)]">
                          <input
                            type="text"
                            value={itemDescriptions[item.statementItemId] ?? item.description}
                            disabled={item.isLinked}
                            onChange={(e) =>
                              setItemDescriptions((prev) => ({
                                ...prev,
                                [item.statementItemId]: e.target.value,
                              }))
                            }
                            className="w-full bg-transparent border-b border-transparent hover:border-[var(--pw-hairline)] focus:border-[var(--pw-accent-primary)] focus:outline-none text-xs py-0.5"
                          />
                          {item.externalReference && (
                            <span className="block text-[10px] text-[var(--pw-text-muted)] font-mono">
                              Ref: {item.externalReference}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--pw-text-secondary)] whitespace-nowrap">
                          {item.itemType}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                          <span
                            className={
                              isCredit
                                ? "text-[var(--pw-accent-green)]"
                                : "text-[var(--pw-text-primary)]"
                            }
                          >
                            {isCredit ? "-" : "+"}฿
                            {item.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <Select
                            value={
                              itemCategories[item.statementItemId]
                                ? String(itemCategories[item.statementItemId])
                                : ""
                            }
                            disabled={item.isLinked}
                            onValueChange={(val) =>
                              setItemCategories((prev) => ({
                                ...prev,
                                [item.statementItemId]: Number(val),
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue placeholder="เลือกหมวดหมู่" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem
                                  key={cat.categoryId}
                                  value={String(cat.categoryId)}
                                  className="text-xs"
                                >
                                  {cat.categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {item.suggestedCategoryName && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--pw-accent-primary)] mt-0.5">
                              <Sparkles className="h-2.5 w-2.5" />
                              {item.suggestedCategoryName}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {item.isLinked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--pw-accent-green)]/10 text-[var(--pw-accent-green)]">
                              <Check className="h-3 w-3" />
                              บันทึกแล้ว
                            </span>
                          ) : item.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--pw-accent-yellow)]/10 text-[var(--pw-accent-yellow)]">
                              <AlertTriangle className="h-3 w-3" />
                              ตรวจพบซ้ำ
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--pw-accent-primary)]/10 text-[var(--pw-accent-primary)]">
                              รอยืนยัน
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

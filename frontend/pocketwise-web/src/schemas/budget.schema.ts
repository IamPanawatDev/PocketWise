import { z } from "zod";
import { isGregorianDateInput } from "@/lib/utils";

export const budgetSchema = z.object({
  budgetName: z.string().trim().min(1, "ต้องระบุชื่องบ").max(150),
  scopeType: z.enum(["total", "category", "tag"]),
  categoryId: z.number().nullable(),
  tagId: z.number().nullable(),
  amountLimit: z.coerce.number().positive("วงเงินต้องมากกว่า 0"),
  periodType: z.enum(["weekly", "monthly", "quarterly", "yearly", "custom"]),
  startDate: z.string().refine(isGregorianDateInput, "กรุณาระบุวันที่เป็นปี ค.ศ."),
  endDate: z.string().nullable(),
  alertThresholdPercent: z.coerce.number().int().min(1).max(100),
}).superRefine((value, context) => {
  if (value.scopeType === "category" && value.categoryId === null) {
    context.addIssue({ code: "custom", path: ["categoryId"], message: "เลือกหมวดหมู่" });
  }
  if (value.scopeType === "tag" && value.tagId === null) {
    context.addIssue({ code: "custom", path: ["tagId"], message: "เลือกแท็ก" });
  }
  if (value.endDate && !isGregorianDateInput(value.endDate)) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "กรุณาระบุวันที่เป็นปี ค.ศ." });
  }
  if (value.endDate && isGregorianDateInput(value.startDate) &&
      isGregorianDateInput(value.endDate) && value.endDate < value.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "วันสิ้นสุดต้องไม่มาก่อนวันเริ่มต้น" });
  }
});

export type BudgetFormValues = z.infer<typeof budgetSchema>;

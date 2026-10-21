import { z } from "zod";
import { isGregorianDateInput } from "@/lib/utils";

export const recurringTransactionSchema = z.object({
  transactionType: z.enum(["income", "expense"]),
  amount: z.coerce.number({ message: "กรุณาระบุจำนวนเงิน" }).positive("จำนวนเงินต้องมากกว่า 0"),
  description: z.string().trim().max(500).nullable(),
  categoryId: z.number().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  intervalValue: z.coerce.number().int().positive("ความถี่ต้องมากกว่า 0"),
  startDate: z.string().refine(isGregorianDateInput, "กรุณาระบุวันที่เป็นปี ค.ศ."),
  endDate: z.string().nullable(),
}).superRefine((value, context) => {
  if (value.endDate && !isGregorianDateInput(value.endDate)) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "กรุณาระบุวันที่เป็นปี ค.ศ." });
  }
  if (value.endDate && isGregorianDateInput(value.startDate) &&
      isGregorianDateInput(value.endDate) && value.endDate < value.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "วันสิ้นสุดต้องไม่มาก่อนวันเริ่มต้น" });
  }
});

export type RecurringTransactionFormValues = z.infer<typeof recurringTransactionSchema>;

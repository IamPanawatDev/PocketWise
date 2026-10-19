import { z } from "zod";

export const transactionSchema = z.object({
  transactionType: z.enum(["income", "expense", "transfer"]),
  amount: z.coerce.number().positive("จำนวนเงินต้องมากกว่า 0"),
  currencyCode: z.string().length(3, "รหัสสกุลเงินต้องเป็น 3 ตัวอักษร").default("THB"),
  transactionDate: z.string().min(1, "ต้องระบุวันที่รายการ"),
  description: z.string().max(500).nullable(),
  categoryId: z.number().nullable(),
  bankAccountId: z.number().nullable(),
  creditCardId: z.number().nullable(),
  tagIds: z.array(z.number()).max(20, "แท็กต้องไม่เกิน 20 รายการ"),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

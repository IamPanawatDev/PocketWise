import { z } from "zod";

export const transferSchema = z
  .object({
    fromBankAccountId: z.coerce.number().positive(),
    toBankAccountId: z.coerce.number().positive(),
    amount: z.coerce.number().positive("จำนวนเงินต้องมากกว่า 0"),
    transferDate: z.string().min(1, "ต้องระบุวันที่โอน"),
    reference: z.string().max(150).nullable(),
  })
  .refine((v) => v.fromBankAccountId !== v.toBankAccountId, {
    message: "บัญชีต้นทางและปลายทางต้องไม่ซ้ำกัน",
    path: ["toBankAccountId"],
  });

export type TransferFormValues = z.infer<typeof transferSchema>;

import { z } from "zod";

export const bankAccountSchema = z.object({
  bankCode: z.string().max(30).nullable().optional(),
  bankName: z.string().min(1, "ต้องระบุชื่อธนาคาร").max(100),
  accountName: z.string().min(1, "ต้องระบุชื่อบัญชี").max(100),
  accountNumberMasked: z.string().max(30).nullable().optional(),
  accountType: z.enum(["cash", "bank", "wallet", "other"], {
    message: "กรุณาเลือกประเภทบัญชี",
  }),
});

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

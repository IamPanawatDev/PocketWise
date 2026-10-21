import { z } from "zod";

const bankCodeRegex = /^[A-Za-z0-9]{2,10}$/;

export const bankAccountSchema = z.object({
  bankCode: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine(
      (val) => !val || bankCodeRegex.test(val),
      "รหัสธนาคารต้องเป็นตัวอักษรภาษาอังกฤษหรือตัวเลข 2-10 ตัวอักษร (เช่น 004 หรือ KBANK)",
    ),
  bankName: z.string().min(1, "ต้องระบุชื่อธนาคาร").max(100),
  accountName: z.string().min(1, "ต้องระบุชื่อบัญชี").max(100),
  accountNumberMasked: z.string().max(30).nullable().optional(),
  accountType: z.enum(["cash", "bank", "wallet", "other"], {
    message: "กรุณาเลือกประเภทบัญชี",
  }),
});

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

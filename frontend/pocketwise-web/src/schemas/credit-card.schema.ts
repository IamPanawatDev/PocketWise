import { z } from "zod";

const optionalNumber = (message: string, minimum: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : Number(value)),
    z.number().min(minimum, message).nullable(),
  );

const cardMaskRegex = /^([*•]{4}[\s-]?)?([*•]{4}[\s-]?)?([*•]{4}[\s-]?)?\d{4}$|^\d{4}$|^[•*]{4,16}\d{4}$/;

export const creditCardSchema = z.object({
  bankName: z.string().trim().min(1, "ต้องระบุชื่อธนาคาร").max(100),
  cardName: z.string().trim().min(1, "ต้องระบุชื่อบัตร").max(100),
  cardNumberMasked: z
    .string()
    .trim()
    .nullable()
    .refine(
      (val) => !val || cardMaskRegex.test(val),
      "รูปแบบเลขบัตรไม่ถูกต้อง (เช่น **** **** **** 1234 หรือ 1234)",
    ),
  billingDay: optionalNumber("วันสรุปยอดต้องอยู่ระหว่าง 1 ถึง 31", 1).pipe(
    z.number().int().max(31).nullable(),
  ),
  paymentDueDay: optionalNumber("วันครบกำหนดต้องอยู่ระหว่าง 1 ถึง 31", 1).pipe(
    z.number().int().max(31).nullable(),
  ),
  creditLimit: optionalNumber("วงเงินต้องไม่ติดลบ", 0),
});

export type CreditCardFormValues = z.infer<typeof creditCardSchema>;

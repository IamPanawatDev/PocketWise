import { z } from "zod";

const optionalNumber = (message: string, minimum: number) =>
  z.preprocess(
    (value) => value === "" || value === undefined ? null : Number(value),
    z.number().min(minimum, message).nullable(),
  );

export const creditCardSchema = z.object({
  bankName: z.string().trim().min(1, "ต้องระบุชื่อธนาคาร").max(100),
  cardName: z.string().trim().min(1, "ต้องระบุชื่อบัตร").max(100),
  cardNumberMasked: z.string().max(25).nullable(),
  billingDay: optionalNumber("วันสรุปยอดต้องอยู่ระหว่าง 1 ถึง 31", 1).pipe(
    z.number().int().max(31).nullable(),
  ),
  paymentDueDay: optionalNumber("วันครบกำหนดต้องอยู่ระหว่าง 1 ถึง 31", 1).pipe(
    z.number().int().max(31).nullable(),
  ),
  creditLimit: optionalNumber("วงเงินต้องไม่ติดลบ", 0),
});

export type CreditCardFormValues = z.infer<typeof creditCardSchema>;

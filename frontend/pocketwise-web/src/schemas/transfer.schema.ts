import { z } from "zod";
import { isThailandDateTimeInput } from "@/lib/utils";

export const transferSchema = z
  .object({
    fromBankAccountId: z.coerce.number().positive(),
    toBankAccountId: z.coerce.number().positive(),
    amount: z.coerce.number({ message: "กรุณาระบุจำนวนเงิน" }).positive("จำนวนเงินต้องมากกว่า 0"),
    transferDate: z.string()
      .min(1, "ต้องระบุวันที่โอน")
      .refine(
        isThailandDateTimeInput,
        "กรุณาระบุวันที่และเวลาเป็นปี ค.ศ. (หากใช้ปี พ.ศ. กรุณาแปลงเป็น ค.ศ.)",
      ),
    reference: z.string().max(150).nullable(),
  })
  .refine((v) => v.fromBankAccountId !== v.toBankAccountId, {
    message: "บัญชีต้นทางและปลายทางต้องไม่ซ้ำกัน",
    path: ["toBankAccountId"],
  });

export type TransferFormValues = z.infer<typeof transferSchema>;

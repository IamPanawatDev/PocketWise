import { z } from "zod";
import { isGregorianDateInput } from "@/lib/utils";

const thaiPhoneRegex = /^(0\d{1,2}-?\d{3,4}-?\d{4}|0\d{8,9})$/;

export const profileSchema = z.object({
  email: z.string().trim().email("กรุณาระบุอีเมลให้ถูกต้อง").max(256),
  displayName: z.string().trim().min(1, "ต้องระบุชื่อที่แสดง").max(150),
  phoneNumber: z
    .string()
    .trim()
    .nullable()
    .refine(
      (val) => !val || thaiPhoneRegex.test(val),
      "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 081-234-5678 หรือ 02-123-4567)",
    ),
  birthDate: z.string().refine(
    (value) => value === "" || isGregorianDateInput(value),
    "กรุณาเลือกวันที่จริงเป็นปี ค.ศ.",
  ),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

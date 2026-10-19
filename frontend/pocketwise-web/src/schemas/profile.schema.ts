import { z } from "zod";
import { isGregorianDateInput } from "@/lib/utils";

export const profileSchema = z.object({
  email: z.string().trim().email("กรุณาระบุอีเมลให้ถูกต้อง").max(256),
  displayName: z.string().trim().min(1, "ต้องระบุชื่อที่แสดง").max(150),
  phoneNumber: z.string().trim().max(30).nullable(),
  birthDate: z.string().refine(
    (value) => value === "" || isGregorianDateInput(value),
    "กรุณาเลือกวันที่จริงเป็นปี ค.ศ.",
  ),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

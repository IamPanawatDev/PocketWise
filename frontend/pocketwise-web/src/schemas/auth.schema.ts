import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร"),
  displayName: z.string().min(1, "ต้องระบุชื่อที่แสดง").max(150),
});

export const loginSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "ต้องระบุรหัสผ่าน"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;

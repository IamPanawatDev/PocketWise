import { z } from "zod";

export const settingsSchema = z.object({
  theme: z.enum(["light", "dark"]),
  currencyCode: z.string().regex(/^[A-Z]{3}$/, "ใช้รหัสสกุลเงินตัวพิมพ์ใหญ่ 3 ตัว"),
  locale: z.string()
    .min(2)
    .max(10)
    .regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "รูปแบบ locale ไม่ถูกต้อง"),
  emailBudgetAlertsEnabled: z.boolean(),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;

import { z } from "zod";

export const merchantSchema = z.object({
  merchantName: z.string().trim().min(1, "ต้องระบุชื่อร้าน").max(200),
  defaultCategoryId: z.number().nullable(),
  bankOrProvider: z.string().trim().max(100).nullable(),
});

export const categoryRuleSchema = z.object({
  ruleName: z.string().trim().min(1, "ต้องระบุชื่อกฎ").max(150),
  matchType: z.enum(["merchantName", "description", "bankReference"]),
  matchPattern: z.string().trim().min(1, "ต้องระบุข้อความที่ใช้จับคู่").max(300),
  categoryId: z.coerce.number().int().positive("เลือกหมวดหมู่"),
  priority: z.coerce.number().int().nonnegative(),
});

export type MerchantFormValues = z.infer<typeof merchantSchema>;
export type CategoryRuleFormValues = z.infer<typeof categoryRuleSchema>;

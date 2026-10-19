import { z } from "zod";

export const categorySchema = z.object({
  categoryName: z.string().min(1, "ต้องระบุชื่อหมวดหมู่").max(100),
  categoryType: z.enum(["income", "expense", "both"]),
  icon: z.string().max(100).nullable(),
  color: z.string().max(20).nullable(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

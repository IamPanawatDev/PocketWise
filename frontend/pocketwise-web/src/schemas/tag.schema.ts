import { z } from "zod";

export const tagSchema = z.object({
  tagName: z.string().min(1, "ต้องระบุชื่อแท็ก").max(50),
  color: z.string().max(20).nullable(),
});

export type TagFormValues = z.infer<typeof tagSchema>;

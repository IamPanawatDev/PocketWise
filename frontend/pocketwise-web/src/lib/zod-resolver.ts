import type { Resolver, FieldValues } from "react-hook-form";
import { z } from "zod";

type ZodIssue = { path: (string | number)[]; message: string; code: string };

/**
 * Minimal zod resolver for react-hook-form, avoiding the extra
 * `@hookform/resolvers` dependency. Maps zod issues to field errors.
 */
export function zodResolver<TFieldValues extends FieldValues>(
  schema: z.ZodType<TFieldValues>,
): Resolver<TFieldValues> {
  const resolver = async (values: unknown) => {
    const result = await schema.safeParseAsync(values);

    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const errors: Record<string, { type: string; message: string }> = {};
    const issues = result.error.issues as ZodIssue[];
    for (const issue of issues) {
      const path = issue.path.join(".") || "root";
      if (!errors[path]) {
        errors[path] = { type: issue.code, message: issue.message };
      }
    }

    return { values: {}, errors };
  };

  return resolver as Resolver<TFieldValues>;
}

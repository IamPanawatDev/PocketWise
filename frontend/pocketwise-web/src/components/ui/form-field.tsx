import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";

type FormFieldProps = React.HTMLAttributes<HTMLDivElement> & {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
};

export function FormField({
  label,
  htmlFor,
  error,
  children,
  className,
  ...props
}: FormFieldProps) {
  return (
    <div className={cn("min-w-0", className)} {...props}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

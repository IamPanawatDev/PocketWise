import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--pw-rounded-sm)] border border-transparent px-4 py-2.5 text-sm font-medium whitespace-nowrap text-center transition-all duration-150 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-[var(--pw-primary)]/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--pw-primary)] text-[var(--pw-on-primary)] hover:brightness-110",
        outline:
          "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]",
        secondary:
          "bg-[var(--pw-link)] text-[var(--pw-ink-dark)] hover:brightness-110",
        ghost:
          "border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]",
        destructive:
          "bg-[var(--pw-magenta)] text-white hover:brightness-110",
        success:
          "bg-[var(--pw-green)] text-[var(--pw-ink-dark)] hover:brightness-110",
        link: "text-[var(--pw-link)] underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-10",
        sm: "min-h-8 px-3 py-1.5 text-xs [&_svg]:size-3.5",
        lg: "min-h-12 px-6 py-3 text-base",
        icon: "size-10 p-0",
        "icon-sm": "size-8 rounded-[var(--pw-rounded-xs)] p-0 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

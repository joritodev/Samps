import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-xs font-medium leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary-ink dark:bg-primary/15",
        secondary:
          "border-transparent bg-foreground/[0.06] text-secondary-foreground dark:bg-foreground/10",
        brand:
          "border-transparent bg-brand/15 text-[hsl(16_80%_36%)] dark:text-brand",
        destructive:
          "border-transparent bg-destructive/10 text-[hsl(0_70%_38%)] dark:bg-destructive/20 dark:text-red-300",
        outline: "border-border bg-card text-muted-foreground",
        success:
          "border-transparent bg-success/10 text-success-ink dark:bg-success/15 dark:text-green-300",
        warning:
          "border-transparent bg-warning/10 text-warning-ink dark:bg-warning/15 dark:text-amber-300",
        info: "border-transparent bg-primary/10 text-primary-ink dark:bg-primary/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

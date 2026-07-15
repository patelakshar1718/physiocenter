import { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground ring-accent-foreground/15",
        success: "bg-success/10 text-success ring-success/25",
        warning: "bg-warning/10 text-warning ring-warning/25",
        destructive: "bg-destructive/10 text-destructive ring-destructive/25",
        muted: "bg-muted text-muted-foreground ring-muted-foreground/15",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

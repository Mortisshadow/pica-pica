import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative grid grid-cols-[auto_1fr] items-start gap-x-3 rounded-2xl border p-4 text-sm", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground",
      warning: "border-amber-300/15 bg-amber-400/[.055] text-amber-50",
      destructive: "border-destructive/20 bg-destructive/10 text-red-100",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Alert({ className, variant, ...props }: HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 data-slot="alert-title" className={cn("font-semibold leading-5", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="alert-description" className={cn("col-start-2 mt-1 text-xs leading-5 opacity-65", className)} {...props} />;
}

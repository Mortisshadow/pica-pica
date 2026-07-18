import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors [&>svg]:pointer-events-none [&>svg]:size-3", {
  variants: {
    variant: {
      default: "border-white/10 bg-black/25 text-white/75",
      secondary: "border-white/10 bg-white/[.07] text-white/80",
      outline: "border-white/15 bg-transparent text-white/70",
      destructive: "border-destructive/20 bg-destructive/10 text-red-200",
    },
  },
  defaultVariants: { variant: "default" },
});

function Badge({ className, variant, asChild = false, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "span";
  return <Component data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };

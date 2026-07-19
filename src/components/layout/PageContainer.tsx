import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[3200px] px-5 sm:px-8 lg:px-10", className)} {...props} />;
}

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">{eyebrow}</p> : null}
        <h1 className="mt-2 text-4xl font-black tracking-[-.055em] sm:text-5xl">{title}</h1>
        {description ? <div className="mt-3 text-sm text-muted-foreground">{description}</div> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

import { cn } from "@/lib/utils";

export function PicaMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative grid size-9 rotate-3 place-items-center rounded-[11px] bg-primary text-primary-foreground shadow-[0_0_26px_rgba(255,255,255,.14)]",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" className="size-6" fill="none">
        <path d="M7 22.5 10.8 7l5.4 9.1L21.5 7 25 22.5l-9 3.4L7 22.5Z" fill="currentColor" />
        <circle cx="12.2" cy="21" r="1.7" fill="#f7f7f8" />
        <circle cx="19.8" cy="21" r="1.7" fill="#f7f7f8" />
      </svg>
    </div>
  );
}

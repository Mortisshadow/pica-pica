import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameArtworkProps {
  title: string;
  start: string;
  end: string;
  variant?: "poster" | "hero" | "thumbnail";
  imageUrl?: string | null;
  className?: string;
}

export function GameArtwork({ title, start, end, variant = "poster", imageUrl, className }: GameArtworkProps) {
  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn("@container/artwork relative isolate overflow-hidden bg-[#17191d]", className)}
      style={{ background: `linear-gradient(145deg, ${start}, ${end})` }}
      role="img"
      aria-label={`${title} Artwork`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading={variant === "hero" ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={variant === "hero" ? "high" : "auto"}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      <div className="absolute -right-[18%] -top-[10%] size-[70%] rounded-full border-[1.8rem] border-white/[.08]" />
      <div className="absolute -bottom-[24%] -left-[24%] size-[72%] rotate-12 rounded-[28%] bg-black/20" />
      <div className="noise" />
      {variant === "poster" ? (
        <div className="absolute inset-0 flex flex-col justify-between p-[12%]">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[.24em] text-white/55">
            <Film className="size-3" /> PICA PICA
          </div>
          <div>
            <div className="mb-4 grid aspect-square w-[30cqw] min-w-12 max-w-20 -rotate-6 place-items-center overflow-hidden rounded-[24%] border border-white/10 bg-black/15 shadow-inner">
              <span className="max-w-full rotate-6 whitespace-nowrap px-1 text-[clamp(1.35rem,13cqw,2.75rem)] font-black leading-none tracking-[-.08em] text-white/28">
                {initials}
              </span>
            </div>
            <div className="max-w-[90%] text-[clamp(1rem,8cqw,1.65rem)] font-black uppercase leading-[.92] tracking-[-.045em] text-white drop-shadow-xl">
              {title}
            </div>
          </div>
        </div>
      ) : null}
      {variant === "thumbnail" ? (
        <div className="absolute inset-0 grid place-items-center text-3xl font-black tracking-[-.06em] text-white/45">{initials}</div>
      ) : null}
    </div>
  );
}

import { AlertCircle, Film, LayoutGrid, MonitorPlay } from "lucide-react";
import { useEffect, useRef } from "react";
import { ClipCard } from "@/components/library/ClipCard";
import { GameArtwork } from "@/components/library/GameArtwork";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { libraryClient } from "@/data/library-client";
import { formatBytes, formatDate, formatDuration } from "@/lib/utils";
import type { Clip, Game } from "@/types/library";

interface VideoPlayerProps {
  game: Game;
  clips: Clip[];
  totalCount: number;
  selected: Clip | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onSelect: (clip: Clip) => void;
}

export function VideoPlayer({ game, clips, totalCount, selected, hasMore, loadingMore, onLoadMore, onSelect }: VideoPlayerProps) {
  const videoUrl = libraryClient.assetUrl(selected?.path ?? null);
  const posterUrl = libraryClient.assetUrl(selected?.thumbnailPath ?? null);
  const otherClips = (selected ? clips.filter((clip) => clip.id !== selected.id) : clips).slice(0, 12);

  return (
    <div>
    <div className={`grid gap-5 ${otherClips.length ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
      <div className="min-w-0">
        <div className="relative aspect-video overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0c0d10] shadow-[0_24px_80px_rgba(0,0,0,.35)]">
          {videoUrl && selected?.compatible ? (
            <ManagedVideo key={videoUrl} src={videoUrl} poster={posterUrl} />
          ) : (
            <>
              <GameArtwork title={game.title} start={game.accentStart} end={game.accentEnd} variant="hero" className="absolute inset-0 size-full opacity-60" />
              <div className="absolute inset-0 bg-black/45" />
              <div className="absolute inset-0 grid place-items-center px-8 text-center">
                <div className="max-w-md">
                  {selected && !selected.compatible ? <AlertCircle className="mx-auto size-8 text-amber-300" /> : <MonitorPlay className="mx-auto size-9 text-white/75" />}
                  <p className="mt-4 text-base font-semibold">
                    {selected && !selected.compatible ? "Dieses Format kann möglicherweise nicht direkt abgespielt werden" : "Wähle einen lokalen Clip aus"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/50">
                    {libraryClient.isDesktop()
                      ? "Pica Pica verändert das Original nicht. MP4 mit H.264 und AAC bietet die beste Kompatibilität."
                      : "Die Browser-Vorschau nutzt Demodaten. In der Desktop-App wird hier dein Originalclip abgespielt."}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
        {selected ? (
          <div className="mt-5 flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-[-.02em]">{selected.fileName}</h2>
              <p className="mt-1.5 text-xs text-muted-foreground">Aufgenommen am {formatDate(selected.createdAt, true)}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Badge>{formatDuration(selected.durationSeconds)}</Badge>
              {selected.width && selected.height ? <Badge>{selected.width} × {selected.height}</Badge> : null}
              <Badge>{formatBytes(selected.sizeBytes)}</Badge>
              {selected.codec ? <Badge className="uppercase">{selected.codec}</Badge> : null}
            </div>
          </div>
        ) : null}
      </div>

      {otherClips.length ? <aside className="hidden min-w-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/[.08] bg-white/[.025] p-3 xl:flex xl:max-h-[calc((100vw-24rem)*.5625_+_5rem)] xl:min-h-[440px]">
        <div className="flex shrink-0 items-center justify-between px-2 pb-3 pt-1">
          <div className="flex items-center gap-2 text-sm font-semibold"><Film className="size-4 text-primary" /> Weitere Clips</div>
          <span className="text-xs text-muted-foreground">{Math.min(Math.max(totalCount - 1, 0), 12)} von {Math.max(totalCount - 1, 0)}</span>
        </div>
        <div className="grid min-h-0 gap-2 sm:grid-cols-2 xl:auto-rows-max xl:flex-1 xl:content-start xl:grid-cols-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          {otherClips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} game={game} active={clip.id === selected?.id} onSelect={() => onSelect(clip)} />
          ))}
        </div>
      </aside> : null}
    </div>

    <section className="mt-12 border-t border-white/[.07] pt-9" aria-labelledby="all-clips-title">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Deine Sammlung</p>
          <h2 id="all-clips-title" className="mt-2 text-2xl font-black tracking-[-.04em]">Alle Clips</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><LayoutGrid className="size-4" /> {clips.length} von {totalCount}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {clips.map((clip) => (
          <ClipCard key={clip.id} clip={clip} game={game} active={clip.id === selected?.id} onSelect={() => onSelect(clip)} />
        ))}
      </div>
      {hasMore ? (
        <div className="mt-8 flex justify-center">
          <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? <Spinner /> : <LayoutGrid className="size-4" />}
            {loadingMore ? "Weitere Clips werden geladen …" : "Weitere Clips laden"}
          </Button>
        </div>
      ) : null}
    </section>
    </div>
  );
}

function ManagedVideo({ src, poster }: { src: string; poster: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    return () => {
      if (!video) return;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster ?? undefined}
      preload="metadata"
      controls
      autoPlay
      className="size-full bg-black object-contain"
    />
  );
}

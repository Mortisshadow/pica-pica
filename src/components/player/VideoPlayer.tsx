import { AlertCircle, Film, Headphones, LayoutGrid, MonitorPlay, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ClipCard } from "@/components/library/ClipCard";
import { GameArtwork } from "@/components/library/GameArtwork";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { libraryClient } from "@/data/library-client";
import { formatBytes, formatDate, formatDuration } from "@/lib/utils";
import type { Clip, Game } from "@/types/library";
import type { MpvAvailability, MpvSnapshot } from "@/types/player";

let nextPlayerSession = 0;

interface VideoPlayerProps {
  game: Game;
  clips: Clip[];
  totalCount: number;
  selected: Clip | null;
  hasMore: boolean;
  loadingMore: boolean;
  playerActive?: boolean;
  onLoadMore: () => void;
  onSelect: (clip: Clip) => void;
}

export function VideoPlayer({ game, clips, totalCount, selected, hasMore, loadingMore, playerActive = true, onLoadMore, onSelect }: VideoPlayerProps) {
  const otherClips = (selected ? clips.filter((clip) => clip.id !== selected.id) : clips).slice(0, 12);

  return (
    <div>
    <div className={`grid gap-5 ${otherClips.length ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
      <div className="min-w-0">
        <NativeMpvPlayer game={game} selected={selected} active={playerActive} />
        {selected ? (
          <div className="mt-5 flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-[-.02em]">{selected.fileName}</h2>
              <p className="mt-1.5 text-xs text-muted-foreground">Recorded {formatDate(selected.createdAt, true)}</p>
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
          <div className="flex items-center gap-2 text-sm font-semibold"><Film className="size-4 text-primary" /> More clips</div>
          <span className="text-xs text-muted-foreground">{Math.min(Math.max(totalCount - 1, 0), 12)} of {Math.max(totalCount - 1, 0)}</span>
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
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Your collection</p>
          <h2 id="all-clips-title" className="mt-2 text-2xl font-black tracking-[-.04em]">All clips</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><LayoutGrid className="size-4" /> {clips.length} of {totalCount}</div>
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
            {loadingMore ? "Loading more clips …" : "Load more clips"}
          </Button>
        </div>
      ) : null}
    </section>
    </div>
  );
}

function NativeMpvPlayer({ game, selected, active }: { game: Game; selected: Clip | null; active: boolean }) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [availability, setAvailability] = useState<MpvAvailability | null>(null);
  const [playback, setPlayback] = useState<{ clipId: string; sessionId: number; snapshot: MpvSnapshot | null; error: string | null } | null>(null);
  const current = playback?.clipId === selected?.id ? playback : null;
  const snapshot = current?.snapshot ?? null;
  const playerReady = Boolean(snapshot);
  const error = current?.error ?? null;
  const fallbackUrl = libraryClient.assetUrl(selected?.compatible ? selected.path : null);
  const posterUrl = libraryClient.assetUrl(selected?.thumbnailPath ?? null);

  useEffect(() => {
    let mounted = true;
    void libraryClient
      .mpvAvailability()
      .then((result) => mounted && setAvailability(result))
      .catch((cause) => mounted && setAvailability({ available: false, version: null, diagnostic: cause instanceof Error ? cause.message : String(cause) }));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selected || !availability?.available) return;
    let mounted = true;
    const sessionId = ++nextPlayerSession;
    void libraryClient
      .mpvLoad(selected.id, sessionId)
      .then((result) => {
        if (mounted) setPlayback({ clipId: selected.id, sessionId, snapshot: result, error: null });
      })
      .catch((cause) => {
        if (mounted) setPlayback({ clipId: selected.id, sessionId, snapshot: null, error: cause instanceof Error ? cause.message : String(cause) });
      });
    return () => {
      mounted = false;
      void libraryClient.mpvStop(sessionId).catch(() => undefined);
    };
  }, [availability?.available, selected]);

  useEffect(() => {
    if (!current?.sessionId || !playerReady) return;
    let mounted = true;
    const poll = window.setInterval(() => {
      void libraryClient
        .mpvSnapshot()
        .then((result) => {
          if (mounted && result.sessionId === current.sessionId) {
            setPlayback((value) => value?.sessionId === current.sessionId ? { ...value, snapshot: result } : value);
          }
        })
        .catch(() => undefined);
    }, 350);
    return () => {
      mounted = false;
      window.clearInterval(poll);
    };
  }, [current?.sessionId, playerReady]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !availability?.available || !current?.sessionId || !playerReady) return;
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rect = surface.getBoundingClientRect();
        const scale = window.devicePixelRatio || 1;
        const fullyVisible = rect.top >= 69 && rect.left >= 0 && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight;
        void libraryClient.mpvViewport({
          x: Math.round(rect.left * scale),
          y: Math.round(rect.top * scale),
          width: Math.round(rect.width * scale),
          height: Math.round(rect.height * scale),
          visible: active && fullyVisible,
          cornerRadius: Math.round(22 * scale),
        }).catch(() => undefined);
      });
    };
    const resizeObserver = new ResizeObserver(update);
    const intersectionObserver = new IntersectionObserver(update, { threshold: [0, 1] });
    resizeObserver.observe(surface);
    intersectionObserver.observe(surface);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    update();
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      void libraryClient.mpvViewport({ x: 0, y: 0, width: 0, height: 0, visible: false, cornerRadius: 0 }).catch(() => undefined);
    };
  }, [active, availability?.available, current?.sessionId, playerReady]);

  const updateSnapshot = (operation: Promise<MpvSnapshot>) => {
    const sessionId = current?.sessionId;
    if (!sessionId) return;
    void operation
      .then((result) => {
        if (result.sessionId === sessionId) {
          setPlayback((value) => value?.sessionId === sessionId ? { ...value, snapshot: result, error: null } : value);
        }
      })
      .catch((cause) => setPlayback((value) => value?.sessionId === sessionId ? { ...value, error: cause instanceof Error ? cause.message : String(cause) } : value));
  };

  const selectedAudio = snapshot?.audioTracks.find((track) => track.selected)?.id;

  return (
    <div>
      <div ref={surfaceRef} className="relative aspect-video overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#050506] shadow-[0_24px_80px_rgba(0,0,0,.35)]">
        {!availability ? (
          <div className="absolute inset-0 grid place-items-center"><Spinner className="size-6" /></div>
        ) : !availability.available && fallbackUrl ? (
          <ManagedVideo key={fallbackUrl} src={fallbackUrl} poster={posterUrl} />
        ) : !availability.available || error || !selected ? (
          <>
            <GameArtwork title={game.title} start={game.accentStart} end={game.accentEnd} variant="hero" className="absolute inset-0 size-full opacity-45" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 grid place-items-center px-8 text-center">
              <div className="max-w-lg">
                {error || !availability.available ? <AlertCircle className="mx-auto size-8 text-amber-300" /> : <MonitorPlay className="mx-auto size-9 text-white/75" />}
                <p className="mt-4 text-base font-semibold">{error ? "libmpv could not play this clip" : selected ? "Embedded libmpv is unavailable" : "Choose a local clip"}</p>
                <p className="mt-2 text-xs leading-5 text-white/50">{error ?? availability.diagnostic ?? "The Windows preview includes libmpv for direct local playback."}</p>
              </div>
            </div>
          </>
        ) : !current?.snapshot ? (
          <div className="absolute inset-0 grid place-items-center"><div className="flex items-center gap-3 text-sm text-white/60"><Spinner /> Starting libmpv …</div></div>
        ) : null}
      </div>

      {availability?.available && snapshot ? (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-white/[.08] bg-white/[.025] p-3 sm:flex-row sm:items-center">
          <Button
            size="icon"
            variant="secondary"
            aria-label={snapshot.paused ? "Play" : "Pause"}
            onClick={() => updateSnapshot(libraryClient.mpvPaused(snapshot.sessionId, !snapshot.paused))}
          >
            {snapshot.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </Button>
          <span className="w-24 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
            {formatDuration(snapshot.positionSeconds)} / {formatDuration(snapshot.durationSeconds)}
          </span>
          <input
            aria-label="Playback position"
            type="range"
            min={0}
            max={Math.max(snapshot.durationSeconds ?? 0, 1)}
            step={0.1}
            value={Math.min(snapshot.positionSeconds, snapshot.durationSeconds ?? snapshot.positionSeconds)}
            onChange={(event) => updateSnapshot(libraryClient.mpvSeek(snapshot.sessionId, Number(event.target.value)))}
            className="h-2 min-w-0 flex-1 cursor-pointer accent-white"
          />
          <Button
            size="icon"
            variant="ghost"
            aria-label={snapshot.muted ? "Unmute" : "Mute"}
            onClick={() => updateSnapshot(libraryClient.mpvMuted(snapshot.sessionId, !snapshot.muted))}
          >
            {snapshot.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Button>
          <input
            aria-label="Volume"
            type="range"
            min={0}
            max={100}
            value={snapshot.volume}
            onChange={(event) => updateSnapshot(libraryClient.mpvVolume(snapshot.sessionId, Number(event.target.value)))}
            className="h-2 w-24 cursor-pointer accent-white"
          />
          {snapshot.audioTracks.length > 1 ? (
            <div className="flex min-w-44 items-center gap-2">
              <Headphones className="size-4 shrink-0 text-muted-foreground" />
              <NativeSelect
                size="sm"
                aria-label="Audio track"
                value={selectedAudio ?? snapshot.audioTracks[0]?.id}
                onChange={(event) => updateSnapshot(libraryClient.mpvAudioTrack(snapshot.sessionId, Number(event.target.value)))}
              >
                {snapshot.audioTracks.map((track, index) => (
                  <NativeSelectOption key={track.id} value={track.id}>
                    {track.title ?? track.language ?? `Audio ${index + 1}`}{track.codec ? ` · ${track.codec.toUpperCase()}` : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          ) : null}
        </div>
      ) : null}
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

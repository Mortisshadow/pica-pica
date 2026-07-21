import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Film, Headphones, LayoutGrid, Maximize2, Minimize2, MonitorPlay, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ClipCard } from "@/components/library/ClipCard";
import { GameArtwork } from "@/components/library/GameArtwork";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { libraryClient } from "@/data/library-client";
import { cn, formatBytes, formatDate, formatDuration } from "@/lib/utils";
import type { Clip, Game } from "@/types/library";
import type { MpvAvailability, MpvSnapshot } from "@/types/player";

let nextPlayerSession = 0;

type SeekDraft = {
  sessionId: number;
  value: number;
  phase: "dragging" | "queued" | "settling";
  operationId: number;
};

interface VideoPlayerProps {
  game: Game;
  clips: Clip[];
  totalCount: number;
  selected: Clip | null;
  hasMore: boolean;
  loadingMore: boolean;
  playerActive?: boolean;
  onLoadMore: () => Promise<Clip[]>;
  onSelect: (clip: Clip) => void;
}

export function VideoPlayer({ game, clips, totalCount, selected, hasMore, loadingMore, playerActive = true, onLoadMore, onSelect }: VideoPlayerProps) {
  const otherClips = clips.slice(0, 12);
  const [playerSurfaceHeight, setPlayerSurfaceHeight] = useState<number | null>(null);
  const selectedIndex = selected ? clips.findIndex((clip) => clip.id === selected.id) : -1;
  const previousClip = selectedIndex > 0 ? clips[selectedIndex - 1] : null;
  const nextClip = selectedIndex >= 0 ? clips[selectedIndex + 1] ?? null : null;

  const selectNextClip = async () => {
    if (nextClip) {
      onSelect(nextClip);
      return;
    }
    if (!hasMore) return;
    const loaded = await onLoadMore();
    if (loaded[0]) onSelect(loaded[0]);
  };

  return (
    <div>
    <div className={`mx-auto grid w-full max-w-[min(100%,calc(177.78vh+102px))] items-start gap-5 ${otherClips.length ? "xl:grid-cols-[minmax(0,1fr)_clamp(340px,20vw,480px)]" : ""}`}>
      <div className="min-w-0">
        <NativeMpvPlayer
          game={game}
          selected={selected}
          active={playerActive}
          previousClip={previousClip}
          nextAvailable={Boolean(nextClip || hasMore)}
          navigationPending={loadingMore}
          onPrevious={() => previousClip && onSelect(previousClip)}
          onNext={() => void selectNextClip()}
          onSurfaceHeight={setPlayerSurfaceHeight}
        />
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

      {otherClips.length ? <aside data-clip-queue style={{ height: playerSurfaceHeight ?? undefined }} className="hidden min-w-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/[.08] bg-white/[.025] p-3 xl:flex">
        <div className="flex shrink-0 items-center justify-between px-2 pb-3 pt-1">
          <div className="flex items-center gap-2 text-sm font-semibold"><Film className="size-4 text-primary" /> More clips</div>
          <span className="text-xs text-muted-foreground">{Math.min(totalCount, 12)} of {totalCount}</span>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 [@media(min-width:2200px)]:grid-cols-5 [@media(min-width:3000px)]:grid-cols-6">
        {clips.map((clip) => (
          <ClipCard key={clip.id} clip={clip} game={game} active={clip.id === selected?.id} onSelect={() => onSelect(clip)} />
        ))}
      </div>
      {hasMore ? (
        <div className="mt-8 flex justify-center">
          <Button variant="secondary" onClick={() => void onLoadMore()} disabled={loadingMore}>
            {loadingMore ? <Spinner /> : <LayoutGrid className="size-4" />}
            {loadingMore ? "Loading more clips …" : "Load more clips"}
          </Button>
        </div>
      ) : null}
    </section>
    </div>
  );
}

interface NativeMpvPlayerProps {
  game: Game;
  selected: Clip | null;
  active: boolean;
  previousClip: Clip | null;
  nextAvailable: boolean;
  navigationPending: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSurfaceHeight: (height: number) => void;
}

function NativeMpvPlayer({ game, selected, active, previousClip, nextAvailable, navigationPending, onPrevious, onNext, onSurfaceHeight }: NativeMpvPlayerProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const snapshotEpochRef = useRef(0);
  const nextOperationIdRef = useRef(0);
  const latestSeekOperationRef = useRef(0);
  const latestAudioOperationRef = useRef(0);
  const volumeRequestRef = useRef(0);
  const previewSeekTimerRef = useRef<number | null>(null);
  const seekSettleTimerRef = useRef<number | null>(null);
  const pendingPreviewSeekRef = useRef<{ sessionId: number; value: number; operationId: number } | null>(null);
  const pendingExactSeekRef = useRef<{ sessionId: number; value: number; operationId: number } | null>(null);
  const seekCommandInFlightRef = useRef(false);
  const pendingAudioSelectionRef = useRef<{ sessionId: number; trackIds: number[]; position: number; operationId: number } | null>(null);
  const audioSelectionDraftRef = useRef<{ sessionId: number; trackIds: number[]; operationId: number } | null>(null);
  const audioCommandInFlightRef = useRef(false);
  const [availability, setAvailability] = useState<MpvAvailability | null>(null);
  const [playback, setPlayback] = useState<{ clipId: string; sessionId: number; snapshot: MpvSnapshot | null; error: string | null } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [controlsHeight, setControlsHeight] = useState(96);
  const [seekDraft, setSeekDraft] = useState<SeekDraft | null>(null);
  const [volumeDraft, setVolumeDraft] = useState<{ sessionId: number; value: number } | null>(null);
  const [audioSelectionDraft, setAudioSelectionDraft] = useState<{ sessionId: number; trackIds: number[]; operationId: number } | null>(null);
  const current = playback?.clipId === selected?.id ? playback : null;
  const snapshot = current?.snapshot ?? null;
  const playerReady = Boolean(snapshot);
  const error = current?.error ?? null;
  const fallbackUrl = libraryClient.assetUrl(selected?.compatible ? selected.path : null);
  const posterUrl = libraryClient.assetUrl(selected?.thumbnailPath ?? null);
  const navigationInset = previousClip || nextAvailable ? 36 : 0;
  const navigationVerticalInset = navigationInset * 9 / 16;

  useEffect(() => {
    let mounted = true;
    void libraryClient
      .mpvAvailability()
      .then((result) => mounted && setAvailability(result))
      .catch((cause) => mounted && setAvailability({ available: false, version: null, diagnostic: cause instanceof Error ? cause.message : String(cause) }));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const reportHeight = () => onSurfaceHeight(surface.getBoundingClientRect().height);
    const observer = new ResizeObserver(reportHeight);
    observer.observe(surface);
    reportHeight();
    return () => observer.disconnect();
  }, [onSurfaceHeight]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const reportHeight = () => setControlsHeight(Math.ceil(controls.getBoundingClientRect().height));
    const observer = new ResizeObserver(reportHeight);
    observer.observe(controls);
    reportHeight();
    return () => observer.disconnect();
  }, [availability?.available]);

  useEffect(() => {
    if (!selected || !availability?.available) return;
    snapshotEpochRef.current += 1;
    volumeRequestRef.current += 1;
    if (previewSeekTimerRef.current !== null) window.clearTimeout(previewSeekTimerRef.current);
    if (seekSettleTimerRef.current !== null) window.clearTimeout(seekSettleTimerRef.current);
    previewSeekTimerRef.current = null;
    seekSettleTimerRef.current = null;
    pendingPreviewSeekRef.current = null;
    pendingExactSeekRef.current = null;
    pendingAudioSelectionRef.current = null;
    audioSelectionDraftRef.current = null;
    latestSeekOperationRef.current = 0;
    latestAudioOperationRef.current = 0;
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
      if (previewSeekTimerRef.current !== null) window.clearTimeout(previewSeekTimerRef.current);
      if (seekSettleTimerRef.current !== null) window.clearTimeout(seekSettleTimerRef.current);
      previewSeekTimerRef.current = null;
      seekSettleTimerRef.current = null;
      pendingPreviewSeekRef.current = null;
      pendingExactSeekRef.current = null;
      pendingAudioSelectionRef.current = null;
      audioSelectionDraftRef.current = null;
      void libraryClient.mpvStop(sessionId).catch(() => undefined);
    };
  }, [availability?.available, selected]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || audioMenuOpen) return;
      if (event.key === "Escape" && fullscreen) {
        void libraryClient.setFullscreen(false).then(() => setFullscreen(false));
      } else if (event.key.toLocaleLowerCase() === "f" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
        const next = !fullscreen;
        void libraryClient.setFullscreen(next).then(() => setFullscreen(next));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [audioMenuOpen, fullscreen]);

  useEffect(() => () => {
    if (fullscreen) void libraryClient.setFullscreen(false);
  }, [fullscreen]);

  useEffect(() => {
    if (!current?.sessionId || !playerReady) return;
    let mounted = true;
    let pollTimer: number | null = null;
    const poll = () => {
      const snapshotEpoch = snapshotEpochRef.current;
      void libraryClient
        .mpvSnapshot()
        .then((result) => {
          if (mounted && snapshotEpoch === snapshotEpochRef.current && result.sessionId === current.sessionId) {
            setPlayback((value) => value?.sessionId === current.sessionId ? { ...value, snapshot: result } : value);
            setSeekDraft((draft) => {
              if (!draft || draft.phase !== "settling" || draft.sessionId !== result.sessionId || result.seeking) return draft;
              return null;
            });
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (mounted) pollTimer = window.setTimeout(poll, 350);
        });
    };
    pollTimer = window.setTimeout(poll, 350);
    return () => {
      mounted = false;
      if (pollTimer !== null) window.clearTimeout(pollTimer);
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
        const visibleLeft = Math.max(rect.left, 0);
        const visibleTop = Math.max(rect.top, fullscreen ? 0 : 69);
        const visibleRight = Math.min(rect.right, window.innerWidth);
        const visibleBottom = Math.min(rect.bottom, window.innerHeight);
        const visibleArea = Math.max(0, visibleRight - visibleLeft) * Math.max(0, visibleBottom - visibleTop);
        const visibleRatio = visibleArea / Math.max(1, rect.width * rect.height);
        void libraryClient.mpvViewport({
          x: Math.round((rect.left + navigationInset) * scale),
          y: Math.round((rect.top + navigationVerticalInset) * scale),
          width: Math.round(Math.max(0, rect.width - navigationInset * 2) * scale),
          height: Math.round(Math.max(0, rect.height - navigationVerticalInset * 2) * scale),
          visible: active && (fullscreen || visibleRatio >= 0.18),
          cornerRadius: fullscreen || navigationInset ? 0 : Math.round(22 * scale),
          clipTop: fullscreen ? 0 : Math.round(Math.max(0, 69 - rect.top - navigationVerticalInset) * scale),
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
      void libraryClient.mpvViewport({ x: 0, y: 0, width: 0, height: 0, visible: false, cornerRadius: 0, clipTop: 0 }).catch(() => undefined);
    };
  }, [active, availability?.available, current?.sessionId, fullscreen, navigationInset, navigationVerticalInset, onSurfaceHeight, playerReady]);

  const updateSnapshot = (operation: Promise<MpvSnapshot>) => {
    const sessionId = current?.sessionId;
    if (!sessionId) return;
    snapshotEpochRef.current += 1;
    void operation
      .then((result) => {
        snapshotEpochRef.current += 1;
        if (result.sessionId === sessionId) {
          setPlayback((value) => value?.sessionId === sessionId ? { ...value, snapshot: result, error: null } : value);
        }
      })
      .catch((cause) => {
        snapshotEpochRef.current += 1;
        setPlayback((value) => value?.sessionId === sessionId ? { ...value, error: cause instanceof Error ? cause.message : String(cause) } : value);
      });
  };

  const snapshotAudioIds = snapshot?.audioTracks.filter((track) => track.selected).map((track) => track.id) ?? [];
  const selectedAudioIds = audioSelectionDraft && audioSelectionDraft.sessionId === snapshot?.sessionId
    ? audioSelectionDraft.trackIds
    : snapshotAudioIds;
  const activeSeekDraft = seekDraft && seekDraft.sessionId === snapshot?.sessionId ? seekDraft.value : null;
  const activeVolumeDraft = volumeDraft && volumeDraft.sessionId === snapshot?.sessionId ? volumeDraft.value : null;
  const selectedAudioLabel = snapshot?.audioTracks.length
    ? selectedAudioIds.length === 1
      ? snapshot.audioTracks.find((track) => track.id === selectedAudioIds[0])?.title
        ?? snapshot.audioTracks.find((track) => track.id === selectedAudioIds[0])?.language
        ?? "1 track"
      : `${selectedAudioIds.length} tracks`
    : "Audio";

  const holdSeekPosition = (sessionId: number, value: number, phase: SeekDraft["phase"], operationId: number) => {
    setSeekDraft({ sessionId, value, phase, operationId });
    if (seekSettleTimerRef.current !== null) window.clearTimeout(seekSettleTimerRef.current);
    seekSettleTimerRef.current = window.setTimeout(() => {
      setSeekDraft((draft) => draft?.sessionId === sessionId && draft.operationId === operationId ? null : draft);
      seekSettleTimerRef.current = null;
    }, 5_000);
  };

  const markSeekSettling = (sessionId: number, operationId: number) => {
    setSeekDraft((draft) => draft?.sessionId === sessionId
      && draft.phase === "queued"
      && draft.operationId === operationId
      ? { ...draft, phase: "settling" }
      : draft);
  };

  const reportPlayerError = (sessionId: number, cause: unknown) => {
    setPlayback((currentPlayback) => currentPlayback?.sessionId === sessionId
      ? { ...currentPlayback, error: cause instanceof Error ? cause.message : String(cause) }
      : currentPlayback);
  };

  const schedulePreviewSeek = () => {
    if (previewSeekTimerRef.current !== null || pendingExactSeekRef.current || seekCommandInFlightRef.current) return;
    previewSeekTimerRef.current = window.setTimeout(() => {
      previewSeekTimerRef.current = null;
      drainSeekQueue();
    }, 75);
  };

  const drainSeekQueue = () => {
    if (seekCommandInFlightRef.current) return;
    const exact = pendingExactSeekRef.current;
    if (exact) {
      pendingExactSeekRef.current = null;
      pendingPreviewSeekRef.current = null;
      seekCommandInFlightRef.current = true;
      snapshotEpochRef.current += 1;
      void libraryClient
        .mpvSeek(exact.sessionId, exact.value)
        .then(() => {
          snapshotEpochRef.current += 1;
          if (latestSeekOperationRef.current !== exact.operationId) return;
          setPlayback((currentPlayback) => currentPlayback?.sessionId === exact.sessionId ? { ...currentPlayback, error: null } : currentPlayback);
          markSeekSettling(exact.sessionId, exact.operationId);
        })
        .catch((cause) => {
          snapshotEpochRef.current += 1;
          if (latestSeekOperationRef.current !== exact.operationId) return;
          reportPlayerError(exact.sessionId, cause);
          setSeekDraft((draft) => draft?.sessionId === exact.sessionId
            && draft.phase === "queued"
            && draft.operationId === exact.operationId
            ? null
            : draft);
        })
        .finally(() => {
          seekCommandInFlightRef.current = false;
          if (pendingExactSeekRef.current) drainSeekQueue();
          else if (pendingPreviewSeekRef.current) schedulePreviewSeek();
        });
      return;
    }

    const preview = pendingPreviewSeekRef.current;
    if (!preview) return;
    pendingPreviewSeekRef.current = null;
    seekCommandInFlightRef.current = true;
    snapshotEpochRef.current += 1;
    void libraryClient
      .mpvPreviewSeek(preview.sessionId, preview.value)
      .then(() => {
        snapshotEpochRef.current += 1;
      })
      .catch((cause) => {
        snapshotEpochRef.current += 1;
        if (latestSeekOperationRef.current !== preview.operationId) return;
        reportPlayerError(preview.sessionId, cause);
        setSeekDraft((draft) => draft?.sessionId === preview.sessionId && draft.operationId === preview.operationId ? null : draft);
      })
      .finally(() => {
        seekCommandInFlightRef.current = false;
        if (pendingExactSeekRef.current) drainSeekQueue();
        else if (pendingPreviewSeekRef.current) schedulePreviewSeek();
      });
  };

  const previewSeek = (value: number) => {
    if (!snapshot) return;
    const sessionId = snapshot.sessionId;
    const operationId = ++nextOperationIdRef.current;
    latestSeekOperationRef.current = operationId;
    snapshotEpochRef.current += 1;
    holdSeekPosition(sessionId, value, "dragging", operationId);
    pendingPreviewSeekRef.current = { sessionId, value, operationId };
    schedulePreviewSeek();
  };

  const commitSeek = (value: number) => {
    if (!snapshot) return;
    const sessionId = snapshot.sessionId;
    const operationId = ++nextOperationIdRef.current;
    latestSeekOperationRef.current = operationId;
    if (previewSeekTimerRef.current !== null) window.clearTimeout(previewSeekTimerRef.current);
    previewSeekTimerRef.current = null;
    pendingPreviewSeekRef.current = null;
    pendingExactSeekRef.current = { sessionId, value, operationId };
    snapshotEpochRef.current += 1;
    holdSeekPosition(sessionId, value, "queued", operationId);
    drainSeekQueue();
  };

  const commitVolume = (value: number) => {
    if (!snapshot) return;
    const sessionId = snapshot.sessionId;
    const requestId = ++volumeRequestRef.current;
    snapshotEpochRef.current += 1;
    setVolumeDraft({ sessionId, value });
    void libraryClient
      .mpvVolume(sessionId, value)
      .then((result) => {
        snapshotEpochRef.current += 1;
        if (result.sessionId === sessionId) {
          setPlayback((currentPlayback) => currentPlayback?.sessionId === sessionId ? { ...currentPlayback, snapshot: result, error: null } : currentPlayback);
        }
      })
      .catch((cause) => {
        snapshotEpochRef.current += 1;
        setPlayback((currentPlayback) => currentPlayback?.sessionId === sessionId ? { ...currentPlayback, error: cause instanceof Error ? cause.message : String(cause) } : currentPlayback);
      })
      .finally(() => {
        if (volumeRequestRef.current === requestId) setVolumeDraft((draft) => draft?.sessionId === sessionId ? null : draft);
      });
  };

  const drainAudioSelection = () => {
    if (audioCommandInFlightRef.current) return;
    const pending = pendingAudioSelectionRef.current;
    if (!pending) return;
    pendingAudioSelectionRef.current = null;
    audioCommandInFlightRef.current = true;
    snapshotEpochRef.current += 1;
    void libraryClient
      .mpvAudioTracks(pending.sessionId, pending.trackIds)
      .then((result) => {
        snapshotEpochRef.current += 1;
        if (result.sessionId !== pending.sessionId || latestAudioOperationRef.current !== pending.operationId) return;
        setPlayback((currentPlayback) => {
          if (currentPlayback?.sessionId !== pending.sessionId || !currentPlayback.snapshot) return currentPlayback;
          return { ...currentPlayback, snapshot: { ...currentPlayback.snapshot, audioTracks: result.audioTracks }, error: null };
        });
        markSeekSettling(pending.sessionId, pending.operationId);
      })
      .catch((cause) => {
        snapshotEpochRef.current += 1;
        if (latestAudioOperationRef.current !== pending.operationId) return;
        reportPlayerError(pending.sessionId, cause);
        setSeekDraft((draft) => draft?.sessionId === pending.sessionId && draft.operationId === pending.operationId ? null : draft);
      })
      .finally(() => {
        audioCommandInFlightRef.current = false;
        if (pendingAudioSelectionRef.current) {
          drainAudioSelection();
        } else {
          if (audioSelectionDraftRef.current?.operationId === pending.operationId) audioSelectionDraftRef.current = null;
          setAudioSelectionDraft((draft) => draft?.operationId === pending.operationId ? null : draft);
        }
      });
  };

  const toggleAudioTrack = (trackId: number, selected: boolean) => {
    if (!snapshot) return;
    const currentIds = audioSelectionDraftRef.current?.sessionId === snapshot.sessionId
      ? audioSelectionDraftRef.current.trackIds
      : selectedAudioIds;
    const nextIds = selected
      ? [...new Set([...currentIds, trackId])]
      : currentIds.filter((id) => id !== trackId);
    if (!nextIds.length) return;
    const position = activeSeekDraft ?? snapshot.positionSeconds;
    const operationId = ++nextOperationIdRef.current;
    latestAudioOperationRef.current = operationId;
    audioSelectionDraftRef.current = { sessionId: snapshot.sessionId, trackIds: nextIds, operationId };
    setAudioSelectionDraft({ sessionId: snapshot.sessionId, trackIds: nextIds, operationId });
    pendingAudioSelectionRef.current = { sessionId: snapshot.sessionId, trackIds: nextIds, position, operationId };
    snapshotEpochRef.current += 1;
    holdSeekPosition(snapshot.sessionId, position, "queued", operationId);
    drainAudioSelection();
  };

  const toggleFullscreen = () => {
    const next = !fullscreen;
    void libraryClient
      .setFullscreen(next)
      .then(() => setFullscreen(next))
      .catch(() => undefined);
  };

  return (
    <div>
      <div ref={surfaceRef} data-player-surface className={cn(
        "group/player relative aspect-video overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#050506] shadow-[0_24px_80px_rgba(0,0,0,.35)]",
        fullscreen && "fixed left-0 right-0 top-0 z-[100] aspect-auto rounded-none border-0 shadow-none",
      )} style={fullscreen ? { bottom: controlsHeight + (audioMenuOpen ? 320 : 0) } : undefined}>
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
        {navigationInset ? (
          <>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Previous clip"
              title={previousClip ? `Previous: ${previousClip.fileName}` : "No previous clip"}
              disabled={!previousClip}
              onClick={onPrevious}
              className="absolute left-0 top-1/2 z-[2] size-9 -translate-y-1/2 rounded-none border-y border-r border-white/10 bg-black/75 opacity-0 backdrop-blur-sm transition-opacity group-hover/player:opacity-100 focus-visible:opacity-100 disabled:opacity-20"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Next clip"
              title={nextAvailable ? "Next clip" : "No next clip"}
              disabled={!nextAvailable || navigationPending}
              onClick={onNext}
              className="absolute right-0 top-1/2 z-[2] size-9 -translate-y-1/2 rounded-none border-y border-l border-white/10 bg-black/75 opacity-0 backdrop-blur-sm transition-opacity group-hover/player:opacity-100 focus-visible:opacity-100 disabled:opacity-20"
            >
              {navigationPending ? <Spinner className="size-4" /> : <ChevronRight className="size-5" />}
            </Button>
          </>
        ) : null}
      </div>

      {availability?.available ? (
        <div ref={controlsRef} className={cn(
          "mt-3 flex min-h-24 flex-col gap-3 rounded-2xl border border-white/[.08] bg-white/[.025] p-3",
          fullscreen && "fixed inset-x-0 bottom-0 z-[101] m-0 rounded-none border-x-0 border-b-0 bg-black px-5",
        )}>
          {snapshot ? (
            <>
              <Slider
                aria-label="Playback position"
                min={0}
                max={Math.max(snapshot.durationSeconds ?? 0, 1)}
                step={0.1}
                value={[Math.min(activeSeekDraft ?? snapshot.positionSeconds, snapshot.durationSeconds ?? activeSeekDraft ?? snapshot.positionSeconds)]}
                aria-valuetext={`${formatDuration(activeSeekDraft ?? snapshot.positionSeconds)} of ${formatDuration(snapshot.durationSeconds)}`}
                onValueChange={([value]) => previewSeek(value)}
                onValueCommit={([value]) => commitSeek(value)}
                className="h-4"
              />
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
                <Button
                  size="icon"
                  variant="secondary"
                  aria-label={snapshot.paused ? "Play" : "Pause"}
                  onClick={() => updateSnapshot(libraryClient.mpvPaused(snapshot.sessionId, !snapshot.paused))}
                >
                  {snapshot.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
                </Button>
                <span className="w-28 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
                  {formatDuration(activeSeekDraft ?? snapshot.positionSeconds)} / {formatDuration(snapshot.durationSeconds)}
                </span>
                <div className="min-w-2 flex-1" />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={snapshot.muted ? "Unmute" : "Mute"}
                  onClick={() => updateSnapshot(libraryClient.mpvMuted(snapshot.sessionId, !snapshot.muted))}
                >
                  {snapshot.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </Button>
                <Slider
                  aria-label="Volume"
                  min={0}
                  max={100}
                  step={1}
                  value={[activeVolumeDraft ?? snapshot.volume]}
                  onValueChange={([value]) => setVolumeDraft({ sessionId: snapshot.sessionId, value })}
                  onValueCommit={([value]) => commitVolume(value)}
                  className="w-24 shrink-0"
                />
                {snapshot.audioTracks.length > 1 ? (
                  <DropdownMenu open={audioMenuOpen} onOpenChange={setAudioMenuOpen} modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="max-w-52 min-w-0" aria-label="Choose included audio tracks">
                        <Headphones className="size-4 shrink-0" />
                        <span className="truncate">{selectedAudioLabel}</span>
                        <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      side={fullscreen ? "top" : "bottom"}
                      sideOffset={10}
                      collisionPadding={12}
                      avoidCollisions={fullscreen}
                      className="max-h-72 w-72 overflow-y-auto"
                    >
                      <DropdownMenuLabel>Included audio tracks</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {snapshot.audioTracks.map((track, index) => {
                        const trackIncluded = selectedAudioIds.includes(track.id);
                        return (
                          <DropdownMenuCheckboxItem
                            key={track.id}
                            checked={trackIncluded}
                            disabled={trackIncluded && selectedAudioIds.length === 1}
                            onCheckedChange={(checked) => toggleAudioTrack(track.id, checked === true)}
                            onSelect={(event) => event.preventDefault()}
                          >
                            <span className="min-w-0 flex-1 truncate">{track.title ?? track.language ?? `Audio ${index + 1}`}</span>
                            {track.codec ? <span className="shrink-0 text-[10px] uppercase text-muted-foreground">{track.codec}</span> : null}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                <Button size="icon" variant="ghost" aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (F)"} onClick={toggleFullscreen}>
                  {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </Button>
              </div>
            </>
          ) : <div className="flex w-full flex-1 items-center justify-center gap-2 text-xs text-muted-foreground"><Spinner /> Loading player …</div>}
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

import { AlertTriangle, ArrowLeft, Calendar, CheckCircle2, Edit3, Film } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GameArtwork } from "@/components/library/GameArtwork";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useLibrary } from "@/features/library/LibraryProvider";
import { MetadataEditor } from "@/features/metadata/MetadataEditor";
import { libraryClient } from "@/data/library-client";
import { pluralizeClips } from "@/lib/utils";
import type { Clip, ClipCursor } from "@/types/library";

const CLIP_PAGE_SIZE = 48;

export function GameDetailPage() {
  const { gameId } = useParams();
  const { library } = useLibrary();
  const game = library?.games.find((item) => item.id === gameId);
  const [clips, setClips] = useState<Clip[]>([]);
  const [nextCursor, setNextCursor] = useState<ClipCursor | null>(null);
  const [clipsLoading, setClipsLoading] = useState(true);
  const [clipError, setClipError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const artworkOpacity = useTransform(scrollYProgress, [0, 0.72, 1], [1, 0.35, 0]);
  const artworkScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 42]);

  useEffect(() => {
    let active = true;
    if (!gameId) return () => { active = false; };
    void libraryClient
      .gameClips(gameId, null, CLIP_PAGE_SIZE)
      .then((page) => {
        if (!active) return;
        setClips(page.clips);
        setNextCursor(page.nextCursor);
        setClipError(null);
      })
      .catch((cause) => active && setClipError(String(cause)))
      .finally(() => active && setClipsLoading(false));
    return () => { active = false; };
  }, [gameId, library?.lastScannedAt]);

  const selected: Clip | null = clips.find((clip) => clip.id === selectedId) ?? clips[0] ?? null;

  async function loadMore() {
    if (!gameId || !nextCursor || clipsLoading) return;
    setClipsLoading(true);
    setClipError(null);
    try {
      const page = await libraryClient.gameClips(gameId, nextCursor, CLIP_PAGE_SIZE);
      setClips((current) => [...current, ...page.clips]);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      setClipError(String(cause));
    } finally {
      setClipsLoading(false);
    }
  }

  if (!game) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 text-center">
        <Empty className="max-w-lg flex-none">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Film className="size-5" /></EmptyMedia>
            <EmptyTitle>Game not found</EmptyTitle>
            <EmptyDescription>This entry is no longer part of your current library.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button asChild variant="secondary"><Link to="/library">Back to library</Link></Button></EmptyContent>
        </Empty>
      </div>
    );
  }

  const heroUrl = libraryClient.assetUrl(game.heroPath);

  return (
    <div className="relative -mt-[69px]">
      <section ref={heroRef} className="relative isolate flex min-h-[78vh] items-end overflow-hidden pt-[69px]">
        <motion.div className="absolute inset-0" style={{ opacity: artworkOpacity, scale: artworkScale }}>
          <GameArtwork title={game.title} start={game.accentStart} end={game.accentEnd} variant="hero" imageUrl={heroUrl} className="size-full" />
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,11,.94)_0%,rgba(8,9,11,.62)_42%,rgba(8,9,11,.12)_72%),linear-gradient(0deg,#08090b_0%,transparent_48%)]" />
        <div className="noise" />
        <motion.div style={{ y: contentY }} className="relative mx-auto w-full max-w-[1640px] px-5 pb-20 pt-32 sm:px-8 lg:px-10 lg:pb-24">
          <Button asChild variant="secondary" size="sm" className="mb-10 bg-black/25 backdrop-blur-md">
            <Link to="/library"><ArrowLeft className="size-4" /> Library</Link>
          </Button>
          <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              {game.metadataStatus === "unresolved" ? (
                <Badge className="border-amber-300/25 bg-amber-400/10 text-amber-100"><AlertTriangle className="mr-1.5 size-3" /> Not matched</Badge>
              ) : (
                <Badge className="border-primary/20 bg-primary/10 text-primary"><CheckCircle2 className="mr-1.5 size-3" /> Saved locally</Badge>
              )}
              {game.releaseYear ? <Badge><Calendar className="mr-1.5 size-3" /> {game.releaseYear}</Badge> : null}
            </div>
            <h1 className="mt-5 text-5xl font-black uppercase leading-[.9] tracking-[-.07em] sm:text-7xl lg:text-8xl">{game.title}</h1>
            <div className="mt-6 flex flex-wrap gap-2">{game.genres.map((genre) => <Badge key={genre}>{genre}</Badge>)}</div>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              {game.description ?? `The “${game.folderName}” folder is ready. Add game details to complete your library.`}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button onClick={() => document.getElementById("clips")?.scrollIntoView({ behavior: "smooth" })}>
                <Film className="size-4" /> View {pluralizeClips(game.clipCount)}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(true)}><Edit3 className="size-4" /> Edit metadata</Button>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section id="clips" className="relative z-10 mx-auto max-w-[1640px] px-5 pb-24 pt-8 sm:px-8 lg:px-10 lg:pt-12">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Replay Buffer</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-.045em]">Your latest moments</h2>
        </div>
        {clipError ? (
          <Alert variant="warning" className="mb-6">
            <AlertTriangle className="mt-0.5 size-4" />
            <AlertTitle>Could not load clips</AlertTitle>
            <AlertDescription>{clipError}</AlertDescription>
          </Alert>
        ) : null}
        {clips.length ? (
          <VideoPlayer
            game={game}
            clips={clips}
            totalCount={game.clipCount}
            selected={selected}
            hasMore={Boolean(nextCursor)}
            loadingMore={clipsLoading}
            playerActive={!editing}
            onLoadMore={() => void loadMore()}
            onSelect={(clip) => setSelectedId(clip.id)}
          />
        ) : clipsLoading ? (
          <div className="grid min-h-72 place-items-center rounded-3xl border border-white/10 bg-white/[.02]">
            <div className="flex items-center gap-3 text-sm text-muted-foreground"><Spinner /> Loading clips …</div>
          </div>
        ) : (
          <Empty className="min-h-72 rounded-3xl border border-white/10 bg-white/[.02]">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Film className="size-5" /></EmptyMedia>
              <EmptyTitle>No clips in this folder yet</EmptyTitle>
              <EmptyDescription>New OBS replays will appear here automatically after the next scan.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
      {editing ? <MetadataEditor game={game} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}

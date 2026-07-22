import { ArrowRight, Clock3, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { GameArtwork } from "@/components/library/GameArtwork";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { libraryClient } from "@/data/library-client";
import { formatDate, formatDuration } from "@/lib/utils";
import type { Clip, Game } from "@/types/library";

interface FeaturedClipProps {
  game: Game;
  clip: Clip;
}

export function FeaturedClip({ game, clip }: FeaturedClipProps) {
  const gamePath = `/games/${game.id}`;
  const heroUrl = libraryClient.assetUrl(game.heroPath);
  const thumbnailUrl = libraryClient.assetUrl(clip.thumbnailPath);

  return (
    <Card className="relative isolate mx-auto mt-8 max-w-[2000px] overflow-hidden border-white/10 bg-black shadow-[0_28px_90px_rgba(0,0,0,.38)]">
      <GameArtwork
        title={game.title}
        start={game.accentStart}
        end={game.accentEnd}
        variant="hero"
        imageUrl={heroUrl}
        className="absolute inset-0 size-full opacity-35"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.94)_0%,rgba(0,0,0,.72)_47%,rgba(0,0,0,.38)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/15" />

      <div className="relative grid min-h-[20rem] items-center gap-8 p-5 sm:p-7 lg:min-h-[clamp(28rem,30vw,34rem)] lg:grid-cols-[minmax(18rem,1fr)_minmax(28rem,48rem)] lg:p-10 xl:gap-12 xl:p-12">
        <CardContent className="max-w-2xl p-0 sm:p-0">
          <Badge variant="secondary" className="border-white/15 bg-black/35 uppercase tracking-[.14em] text-white/80 backdrop-blur-md">
            Newest clip
          </Badge>
          <h2 className="mt-5 text-balance text-3xl font-black tracking-[-.045em] text-white sm:text-4xl lg:text-5xl">
            {game.title}
          </h2>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/65">
            <Clock3 className="size-4" aria-hidden="true" />
            <span>Recorded {formatDate(clip.createdAt, true)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDuration(clip.durationSeconds)}</span>
          </p>
          <p className="mt-2 max-w-xl truncate text-sm text-white/45">{clip.fileName}</p>
          <Button asChild className="mt-7">
            <Link to={gamePath}>
              Open game <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>

        <Link
          to={gamePath}
          aria-label={`Open the newest ${game.title} clip`}
          className="group/preview relative mx-auto block aspect-video w-full max-w-[48rem] overflow-hidden rounded-2xl border border-white/15 bg-black shadow-[0_24px_80px_rgba(0,0,0,.55)] outline-none transition duration-500 hover:-translate-y-1 hover:border-white/30 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-4 focus-visible:ring-offset-black lg:mx-0 lg:justify-self-end"
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="size-full object-cover transition duration-700 group-hover/preview:scale-[1.02]"
            />
          ) : (
            <GameArtwork
              title={game.title}
              start={game.accentStart}
              end={game.accentEnd}
              variant="thumbnail"
              imageUrl={heroUrl}
              className="size-full transition duration-700 group-hover/preview:scale-[1.02]"
            />
          )}
          <div className="absolute inset-0 bg-black/10 transition group-hover/preview:bg-black/25" />
          <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-2xl transition duration-300 group-hover/preview:scale-110">
            <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />
          </span>
          <Badge className="absolute bottom-3 right-3 border-white/15 bg-black/70 text-white backdrop-blur-md">
            {formatDuration(clip.durationSeconds)}
          </Badge>
        </Link>
      </div>
    </Card>
  );
}

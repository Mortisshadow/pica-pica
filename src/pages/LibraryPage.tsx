import { AlertTriangle, ArrowDownAZ, Film, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { GameCard } from "@/components/library/GameCard";
import { PageContainer, PageHeading } from "@/components/layout/PageContainer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { useLibrary } from "@/features/library/LibraryProvider";
import { pluralizeClips } from "@/lib/utils";

type SortMode = "recent" | "title" | "clips";

export function LibraryPage() {
  const { library, scanning, rescan, error } = useLibrary();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");

  const games = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return [...(library?.games ?? [])]
      .filter((game) => !normalized || game.title.toLocaleLowerCase().includes(normalized) || game.folderName.toLocaleLowerCase().includes(normalized))
      .sort((a, b) => {
        if (sort === "title") return a.title.localeCompare(b.title);
        if (sort === "clips") return b.clipCount - a.clipCount;
        return (b.newestClipAt ?? 0) - (a.newestClipAt ?? 0);
      });
  }, [library, query, sort]);

  const totalClips = library?.games.reduce((sum, game) => sum + game.clipCount, 0) ?? 0;
  const unresolved = library?.games.filter((game) => game.metadataStatus === "unresolved").length ?? 0;

  return (
    <PageContainer className="pb-20 pt-10 lg:pt-14">
      <PageHeading
        eyebrow="Your collection"
        title="Library"
        description={<>{library?.games.length ?? 0} {library?.games.length === 1 ? "game" : "games"} <span className="mx-1.5">·</span> {pluralizeClips(totalClips)}</>}
        actions={<div className="flex flex-col gap-3 sm:flex-row">
          <InputGroup className="sm:w-72">
            <InputGroupAddon><Search className="size-4" /></InputGroupAddon>
            <InputGroupInput aria-label="Search games" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games …" />
          </InputGroup>
          <div className="relative">
            <ArrowDownAZ className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <NativeSelect
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="pl-10 sm:w-auto"
              aria-label="Sort order"
            >
              <NativeSelectOption value="recent">Recently played</NativeSelectOption>
              <NativeSelectOption value="title">Title</NativeSelectOption>
              <NativeSelectOption value="clips">Most clips</NativeSelectOption>
            </NativeSelect>
          </div>
          <Button variant="secondary" onClick={() => void rescan()} disabled={scanning}>
            {scanning ? <Spinner /> : <RefreshCw className="size-4" />} {scanning ? "Scanning …" : "Rescan"}
          </Button>
        </div>}
      />

      {unresolved > 0 ? (
        <Alert variant="warning" className="mt-8">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <AlertTitle>{unresolved} {unresolved === 1 ? "folder needs" : "folders need"} your help</AlertTitle>
          <AlertDescription>Open a marked game and complete its match. Pica Pica does not guess when a result is uncertain.</AlertDescription>
        </Alert>
      ) : null}

      {error ? <Alert variant="destructive" className="mt-6"><AlertTriangle className="mt-0.5 size-4" /><AlertTitle>Scan failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      {games.length > 0 ? (
        <section className="mt-9 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" aria-label="Games">
          {games.map((game, index) => <GameCard key={game.id} game={game} index={index} />)}
        </section>
      ) : (
        <Empty className="mt-14 min-h-80 rounded-3xl border border-white/10 bg-white/[.02]">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Film className="size-5" /></EmptyMedia>
            <EmptyTitle>No games found</EmptyTitle>
            <EmptyDescription>
              {query ? "No game matches your search." : "Add game subfolders containing video files to your selected clips folder."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </PageContainer>
  );
}

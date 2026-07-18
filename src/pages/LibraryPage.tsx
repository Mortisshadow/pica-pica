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
        eyebrow="Deine Sammlung"
        title="Bibliothek"
        description={<>{library?.games.length ?? 0} Spiele <span className="mx-1.5">·</span> {pluralizeClips(totalClips)}</>}
        actions={<div className="flex flex-col gap-3 sm:flex-row">
          <InputGroup className="sm:w-72">
            <InputGroupAddon><Search className="size-4" /></InputGroupAddon>
            <InputGroupInput aria-label="Spiele durchsuchen" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Spiele durchsuchen …" />
          </InputGroup>
          <div className="relative">
            <ArrowDownAZ className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <NativeSelect
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="pl-10 sm:w-auto"
              aria-label="Sortierung"
            >
              <NativeSelectOption value="recent">Zuletzt gespielt</NativeSelectOption>
              <NativeSelectOption value="title">Titel</NativeSelectOption>
              <NativeSelectOption value="clips">Meiste Clips</NativeSelectOption>
            </NativeSelect>
          </div>
          <Button variant="secondary" onClick={() => void rescan()} disabled={scanning}>
            {scanning ? <Spinner /> : <RefreshCw className="size-4" />} {scanning ? "Scannt …" : "Neu scannen"}
          </Button>
        </div>}
      />

      {unresolved > 0 ? (
        <Alert variant="warning" className="mt-8">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <AlertTitle>{unresolved} {unresolved === 1 ? "Ordner braucht" : "Ordner brauchen"} deine Hilfe</AlertTitle>
          <AlertDescription>Öffne das markierte Spiel und ergänze die Zuordnung. Pica Pica rät nicht, wenn der Treffer unsicher ist.</AlertDescription>
        </Alert>
      ) : null}

      {error ? <Alert variant="destructive" className="mt-6"><AlertTriangle className="mt-0.5 size-4" /><AlertTitle>Scan fehlgeschlagen</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      {games.length > 0 ? (
        <section className="mt-9 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" aria-label="Spiele">
          {games.map((game, index) => <GameCard key={game.id} game={game} index={index} />)}
        </section>
      ) : (
        <Empty className="mt-14 min-h-80 rounded-3xl border border-white/10 bg-white/[.02]">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Film className="size-5" /></EmptyMedia>
            <EmptyTitle>Keine Spiele gefunden</EmptyTitle>
            <EmptyDescription>
              {query ? "Kein Spiel passt zu deiner Suche." : "Lege Spiel-Unterordner mit Videodateien in deinem ausgewählten Clipordner an."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </PageContainer>
  );
}

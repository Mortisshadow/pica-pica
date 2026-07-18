import { AlertTriangle, Check, ImagePlus, Search, Sparkles, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { libraryClient } from "@/data/library-client";
import { useLibrary } from "@/features/library/LibraryProvider";
import type { ArtworkKind, Game, MetadataSearchResult } from "@/types/library";

export function MetadataEditor({ game, onClose }: { game: Game; onClose: () => void }) {
  const { updateMetadata, applyMetadata, setCustomArtwork } = useLibrary();
  const [title, setTitle] = useState(game.title);
  const [description, setDescription] = useState(game.description ?? "");
  const [genres, setGenres] = useState(game.genres.join(", "));
  const [releaseYear, setReleaseYear] = useState(game.releaseYear?.toString() ?? "");
  const [results, setResults] = useState<MetadataSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [artworkKind, setArtworkKind] = useState<ArtworkKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function searchOnline() {
    if (title.trim().length < 2) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await libraryClient.searchMetadata(title));
    } catch (cause) {
      setError(String(cause));
    } finally {
      setSearching(false);
    }
  }

  async function chooseResult(result: MetadataSearchResult) {
    setApplyingId(result.providerId);
    setError(null);
    try {
      await applyMetadata(game.id, result.providerId);
      onClose();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setApplyingId(null);
    }
  }

  async function chooseArtwork(kind: ArtworkKind) {
    setArtworkKind(kind);
    setError(null);
    try {
      const path = await libraryClient.pickArtwork(kind);
      if (path) await setCustomArtwork(game.id, kind, path);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setArtworkKind(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateMetadata({
        gameId: game.id,
        title: title.trim(),
        description: description.trim() || null,
        genres: genres.split(",").map((value) => value.trim()).filter(Boolean),
        releaseYear: releaseYear ? Number(releaseYear) : null,
      });
      onClose();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} aria-labelledby="metadata-title" aria-describedby="metadata-description">
      <form onSubmit={submit}>
        <DialogHeader className="flex-row items-start gap-4 text-left">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted"><Sparkles className="size-5" /></div>
          <div className="min-w-0 flex-1">
            <DialogTitle id="metadata-title">Spiel und Artwork zuordnen</DialogTitle>
            <DialogDescription id="metadata-description" className="mt-1">Ordner „{game.folderName}“. Online-Treffer werden bestätigt und anschließend vollständig lokal gecacht.</DialogDescription>
          </div>
          <DialogClose asChild><Button type="button" variant="ghost" size="icon" aria-label="Schließen"><X className="size-4" /></Button></DialogClose>
        </DialogHeader>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0 space-y-4">
            <Field className="gap-2">
              <FieldLabel htmlFor="game-title">Spieltitel</FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="game-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required />
                <Button type="button" variant="secondary" disabled={searching || title.trim().length < 2} onClick={() => void searchOnline()}>
                  {searching ? <Spinner /> : <Search className="size-4" />} Online suchen
                </Button>
              </div>
            </Field>

            {results.length > 0 ? (
              <div className="space-y-2" aria-label="RAWG-Suchergebnisse">
                {results.map((result) => (
                  <Card key={result.providerId} className="flex items-center gap-3 bg-muted/30 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{result.title}</p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">{[result.releaseYear, ...result.platforms.slice(0, 2)].filter(Boolean).join(" · ") || "Keine Zusatzdaten"}</p>
                    </div>
                    <Button type="button" size="sm" disabled={Boolean(applyingId)} onClick={() => void chooseResult(result)}>
                      {applyingId === result.providerId ? <Spinner className="size-3.5" /> : <Check className="size-3.5" />} Übernehmen
                    </Button>
                  </Card>
                ))}
              </div>
            ) : null}

            <Separator />
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field className="gap-2"><FieldLabel htmlFor="release-year">Erscheinungsjahr</FieldLabel><Input id="release-year" type="number" min="1970" max="2100" value={releaseYear} onChange={(event) => setReleaseYear(event.target.value)} placeholder="2026" /></Field>
              <Field className="gap-2"><FieldLabel htmlFor="genres">Genres, kommagetrennt</FieldLabel><Input id="genres" value={genres} onChange={(event) => setGenres(event.target.value)} placeholder="Shooter, Team" /></Field>
              <Field className="gap-2 sm:col-span-2"><FieldLabel htmlFor="description">Beschreibung</FieldLabel><Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Eine kurze Beschreibung des Spiels …" /></Field>
            </FieldGroup>
          </div>

          <aside className="space-y-3 rounded-2xl border bg-muted/20 p-4">
            <div><p className="text-sm font-semibold">Eigenes Artwork</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Manuelle Bilder überschreiben Provider-Artwork dauerhaft.</p></div>
            <Button type="button" variant="secondary" className="w-full justify-start" disabled={Boolean(artworkKind)} onClick={() => void chooseArtwork("poster")}>
              {artworkKind === "poster" ? <Spinner /> : <ImagePlus className="size-4" />} Poster auswählen
            </Button>
            <Button type="button" variant="secondary" className="w-full justify-start" disabled={Boolean(artworkKind)} onClick={() => void chooseArtwork("hero")}>
              {artworkKind === "hero" ? <Spinner /> : <ImagePlus className="size-4" />} Hero auswählen
            </Button>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {game.metadataProvider ? <Badge>{game.metadataProvider.toUpperCase()}</Badge> : null}
              {game.artworkProvider ? <Badge>Art: {game.artworkProvider}</Badge> : null}
            </div>
          </aside>
        </div>

        {error ? <Alert variant="warning" className="mt-5"><AlertTriangle className="mt-0.5 size-4" /><AlertTitle>Aktion nicht möglich</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <DialogFooter className="mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" disabled={saving || !title.trim()}>{saving ? <Spinner /> : <Check className="size-4" />} {saving ? "Speichert …" : "Manuell speichern"}</Button>
        </DialogFooter>
      </form>
      </DialogContent>
    </Dialog>
  );
}

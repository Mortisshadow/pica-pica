import { AlertTriangle, Check, ChevronRight, FolderHeart, FolderOpen, LockKeyhole, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PicaMark } from "@/components/brand/PicaMark";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { libraryClient } from "@/data/library-client";
import { useLibrary } from "@/features/library/LibraryProvider";

const benefits = [
  { icon: LockKeyhole, title: "Bleibt bei dir", text: "Clips werden weder hochgeladen noch verändert." },
  { icon: Sparkles, title: "Schön sortiert", text: "Ordner werden zu einer visuellen Spielebibliothek." },
  { icon: FolderHeart, title: "Offline bereit", text: "Index und Artwork liegen sicher im App-Cache." },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { configure, scanning, error } = useLibrary();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  async function selectFolder() {
    const path = await libraryClient.pickRoot();
    if (path) setSelectedPath(path);
  }

  async function continueSetup() {
    if (!selectedPath) return;
    await configure(selectedPath);
    navigate("/library", { replace: true });
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#08090b] px-5 py-8 sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_15%,rgba(255,255,255,.1),transparent_30rem),radial-gradient(circle_at_15%_80%,rgba(255,255,255,.045),transparent_32rem)]" />
      <div className="noise" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <div className="flex items-center gap-3">
          <PicaMark />
          <span className="font-black tracking-[-.04em]">PICA PICA</span>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] items-center gap-14 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)]">
          <motion.section className="min-w-0" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[.07] px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> Deine Momente, deine Bibliothek
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[.94] tracking-[-.065em] sm:text-6xl xl:text-7xl">
              Replay-Clips verdienen mehr als einen <span className="text-primary">Dateiordner.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Verwandle deinen OBS-Ordner in eine schnelle, private und wunderschöne Gaming-Bibliothek – ganz ohne Werbung oder Account.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:max-w-2xl">
              {benefits.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-white/[.07] bg-white/[.035] p-4">
                  <Icon className="size-4 text-primary" />
                  <h2 className="mt-3 text-sm font-semibold">{title}</h2>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="min-w-0 rounded-[2rem] border border-white/10 bg-[#111216]/90 p-5 shadow-[0_40px_120px_rgba(0,0,0,.45)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Schritt 1 von 1</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-.035em]">Wo liegen deine Clips?</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Wähle den Ordner, in dem deine Spiele-Unterordner liegen.</p>
              </div>
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/[.06]">
                <FolderOpen className="size-5 text-primary" />
              </div>
            </div>

            <Item asChild variant="outline" className="mt-7 flex-nowrap rounded-2xl border-dashed border-white/15 bg-black/20 p-5 hover:border-primary/35 hover:bg-primary/[.035]">
              <button type="button" onClick={selectFolder}>
                <ItemMedia variant="icon" className="size-12 self-center! translate-y-0! rounded-xl border-0 bg-primary text-primary-foreground">
                  {selectedPath ? <Check className="size-5" /> : <FolderOpen className="size-5" />}
                </ItemMedia>
                <ItemContent className="min-w-0 gap-1">
                  <ItemTitle className="font-semibold">{selectedPath ? "Ordner ausgewählt" : "Clipordner auswählen"}</ItemTitle>
                  <ItemDescription className="line-clamp-1 text-xs">{selectedPath ?? "Zum Beispiel D:\\Clips oder /home/name/Videos/Clips"}</ItemDescription>
                </ItemContent>
                <ItemActions><ChevronRight className="size-4 text-muted-foreground" /></ItemActions>
              </button>
            </Item>

            {error ? <Alert variant="destructive" className="mt-4"><AlertTriangle className="mt-0.5 size-4" /><AlertTitle>Ordner konnte nicht gelesen werden</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

            <Button size="lg" className="mt-5 w-full" disabled={!selectedPath || scanning} onClick={continueSetup}>
              {scanning ? <Spinner /> : null}
              {scanning ? "Bibliothek wird aufgebaut …" : "Bibliothek erstellen"}
              {!scanning ? <ChevronRight className="size-4" /> : null}
            </Button>
            <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
              Pica Pica liest Dateien nur. Originale werden niemals automatisch verschoben, umbenannt oder gelöscht.
            </p>
          </motion.section>
        </div>
      </div>
    </main>
  );
}

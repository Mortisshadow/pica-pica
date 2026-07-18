import { CheckCircle2, Database, FolderOpen, HardDrive, KeyRound, ShieldCheck, Video } from "lucide-react";
import { Fragment, useEffect, useState, type FormEvent } from "react";
import { PageContainer, PageHeading } from "@/components/layout/PageContainer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { libraryClient } from "@/data/library-client";
import { useLibrary } from "@/features/library/LibraryProvider";
import type { ProviderSettings } from "@/types/library";

type Provider = "rawg" | "steamgriddb";

export function SettingsPage() {
  const { library } = useLibrary();
  const [providerSettings, setProviderSettings] = useState<ProviderSettings | null>(null);
  const [rawgKey, setRawgKey] = useState("");
  const [steamGridKey, setSteamGridKey] = useState("");
  const [saving, setSaving] = useState<Provider | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void libraryClient.providerSettings().then(setProviderSettings).catch((cause) => setError(String(cause)));
  }, []);

  async function saveKey(event: FormEvent, provider: Provider) {
    event.preventDefault();
    const value = provider === "rawg" ? rawgKey : steamGridKey;
    if (!value.trim()) return;
    setSaving(provider);
    setError(null);
    setNotice(null);
    try {
      setProviderSettings(await libraryClient.saveProviderKey(provider, value));
      if (provider === "rawg") setRawgKey("");
      else setSteamGridKey("");
      setNotice(`${provider === "rawg" ? "RAWG" : "SteamGridDB"}-Schlüssel wurde im Betriebssystem-Schlüsselspeicher gesichert.`);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setSaving(null);
    }
  }

  const ffmpegLabel = !library?.ffmpegAvailable
    ? "Nicht gefunden – Thumbnails werden übersprungen"
    : library.ffmpegSource === "bundled"
      ? "Mit Pica Pica gebündelt"
      : "Systeminstallation erkannt";
  const rows = [
    { icon: FolderOpen, label: "Bibliotheksordner", value: library?.rootPath ?? "Nicht eingerichtet" },
    { icon: Database, label: "Lokaler Cache", value: library?.cachePath ?? "–" },
    { icon: Video, label: "FFmpeg", value: ffmpegLabel },
    { icon: HardDrive, label: "Speichermodus", value: "Lokale App-Daten; Originalclips bleiben unangetastet" },
  ];

  return (
    <PageContainer className="max-w-5xl py-12 lg:py-16">
      <PageHeading eyebrow="Pica Pica" title="Einstellungen" description="Lokale Bibliothek, sichere API-Schlüssel und Video-Werkzeuge." />

      <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card className="bg-card/65">
          <CardHeader>
            <CardTitle>Lokales System</CardTitle>
            <CardDescription>Pfade und Werkzeuge, die Pica Pica auf diesem Gerät verwendet.</CardDescription>
          </CardHeader>
          <CardContent>
            <ItemGroup className="-mx-4">
            {rows.map(({ icon: Icon, label, value }, index) => (
              <Fragment key={label}>
                <Item role="listitem" className="gap-3.5 border-0 px-4 py-3.5">
                  <ItemMedia variant="icon" className="size-10 self-center! translate-y-0! rounded-xl border-0">
                    <Icon className="size-4 text-primary" />
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-0.5">
                    <ItemTitle className="font-semibold leading-4">{label}</ItemTitle>
                    <ItemDescription className="line-clamp-none break-all text-xs leading-4">{value}</ItemDescription>
                  </ItemContent>
                </Item>
                {index < rows.length - 1 ? <ItemSeparator className="mx-4 w-auto" /> : null}
              </Fragment>
            ))}
            </ItemGroup>
          </CardContent>
        </Card>

        <Card className="bg-card/65">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-muted"><KeyRound className="size-4" /></div>
              <div><CardTitle>Online-Metadaten</CardTitle><CardDescription>Optional und nur bei einer manuellen Suche aktiv.</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProviderKeyForm
              provider="RAWG"
              configured={providerSettings?.rawgConfigured ?? false}
              value={rawgKey}
              onChange={setRawgKey}
              saving={saving === "rawg"}
              onSubmit={(event) => void saveKey(event, "rawg")}
              helpUrl="https://rawg.io/apidocs"
            />
            <Separator />
            <ProviderKeyForm
              provider="SteamGridDB"
              configured={providerSettings?.steamGridDbConfigured ?? false}
              value={steamGridKey}
              onChange={setSteamGridKey}
              saving={saving === "steamgriddb"}
              onSubmit={(event) => void saveKey(event, "steamgriddb")}
              helpUrl="https://www.steamgriddb.com/profile/preferences/api"
            />
            <Alert>
              <ShieldCheck className="mt-0.5 size-4" />
              <AlertTitle>Keine Schlüssel in SQLite oder Git</AlertTitle>
              <AlertDescription>Windows Credential Manager, macOS Keychain beziehungsweise Linux Secret Service übernehmen die Speicherung.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {notice ? <Alert className="mt-6"><CheckCircle2 className="mt-0.5 size-4" /><AlertTitle>Gespeichert</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert> : null}
      {error ? <Alert variant="destructive" className="mt-6"><KeyRound className="mt-0.5 size-4" /><AlertTitle>Änderung fehlgeschlagen</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
    </PageContainer>
  );
}

function ProviderKeyForm({ provider, configured, value, onChange, saving, onSubmit, helpUrl }: {
  provider: string;
  configured: boolean;
  value: string;
  onChange: (value: string) => void;
  saving: boolean;
  onSubmit: (event: FormEvent) => void;
  helpUrl: string;
}) {
  return (
    <form onSubmit={onSubmit}>
      <Field className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor={`${provider}-key`}>{provider} API-Key</FieldLabel>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {configured ? <><CheckCircle2 className="size-3 text-white" /> Konfiguriert</> : "Nicht konfiguriert"}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id={`${provider}-key`} type="password" autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} placeholder={configured ? "Neuen Schlüssel hinterlegen" : "API-Schlüssel einfügen"} />
          <Button type="submit" variant="secondary" disabled={!value.trim() || saving}>
            {saving ? <Spinner /> : <KeyRound className="size-4" />} Speichern
          </Button>
        </div>
        <div><Button type="button" variant="ghost" size="sm" className="-ml-3 text-muted-foreground" onClick={() => void libraryClient.openExternal(helpUrl)}>Schlüssel beim Anbieter erstellen</Button></div>
      </Field>
    </form>
  );
}

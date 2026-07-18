import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { libraryClient } from "@/data/library-client";
import type { ArtworkKind, BootstrapState, LibrarySnapshot, MetadataUpdate, ScanResult } from "@/types/library";

interface LibraryContextValue {
  bootstrap: BootstrapState | null;
  library: LibrarySnapshot | null;
  loading: boolean;
  scanning: boolean;
  error: string | null;
  configure: (rootPath: string) => Promise<ScanResult>;
  rescan: () => Promise<ScanResult>;
  updateMetadata: (update: MetadataUpdate) => Promise<void>;
  applyMetadata: (gameId: string, rawgId: string) => Promise<void>;
  setCustomArtwork: (gameId: string, kind: ArtworkKind, sourcePath: string) => Promise<void>;
  clearError: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [bootstrap, setBootstrap] = useState<BootstrapState | null>(null);
  const [library, setLibrary] = useState<LibrarySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    libraryClient
      .bootstrap()
      .then((result) => {
        if (!active) return;
        setBootstrap(result);
        setLibrary(result.library);
      })
      .catch((cause) => active && setError(messageFrom(cause)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const configure = useCallback(async (rootPath: string) => {
    setScanning(true);
    setError(null);
    try {
      const result = await libraryClient.configure(rootPath);
      setLibrary(result.library);
      setBootstrap({
        configured: true,
        rootPath: result.library.rootPath,
        cachePath: result.library.cachePath,
        ffmpegAvailable: result.library.ffmpegAvailable,
        ffmpegSource: result.library.ffmpegSource,
        library: result.library,
      });
      return result;
    } catch (cause) {
      setError(messageFrom(cause));
      throw cause;
    } finally {
      setScanning(false);
    }
  }, []);

  const rescan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const result = await libraryClient.scan();
      setLibrary(result.library);
      return result;
    } catch (cause) {
      setError(messageFrom(cause));
      throw cause;
    } finally {
      setScanning(false);
    }
  }, []);

  const updateMetadata = useCallback(async (update: MetadataUpdate) => {
    setLibrary(await libraryClient.updateMetadata(update));
  }, []);

  const applyMetadata = useCallback(async (gameId: string, rawgId: string) => {
    setLibrary(await libraryClient.applyMetadata(gameId, rawgId));
  }, []);

  const setCustomArtwork = useCallback(async (gameId: string, kind: ArtworkKind, sourcePath: string) => {
    setLibrary(await libraryClient.setCustomArtwork(gameId, kind, sourcePath));
  }, []);

  const value = useMemo(
    () => ({
      bootstrap,
      library,
      loading,
      scanning,
      error,
      configure,
      rescan,
      updateMetadata,
      applyMetadata,
      setCustomArtwork,
      clearError: () => setError(null),
    }),
    [bootstrap, library, loading, scanning, error, configure, rescan, updateMetadata, applyMetadata, setCustomArtwork],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

// The hook intentionally lives beside its provider so the context stays private.
// eslint-disable-next-line react-refresh/only-export-components
export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary must be used inside LibraryProvider");
  return context;
}

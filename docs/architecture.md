# Architecture

## Boundaries

Pica Pica uses the WebView only for presentation. Trusted filesystem traversal, persistence, video probing, and thumbnail generation stay in Rust. The frontend talks to that boundary through a small typed client in `src/data/library-client.ts`.

The browser demo adapter is selected only when the Tauri runtime is absent. It lets contributors build and review the interface without granting filesystem access or sharing private media.

## Storage decision

The primary database and derived cache live under Tauri's application data directory. Storing `.pica-pica` beside the selected root would make portable backups convenient, but it also fails on read-only folders, network mounts, and managed locations. A later portable mode can export or relocate the cache explicitly.

SQLite owns the durable index. `PRAGMA user_version` drives migrations, WAL permits responsive reads during updates, and paths are unique. Each scan uses a monotonically increasing generation: upserts mark current rows and a final delete removes stale clips and games only after a complete directory walk. Manual game metadata survives rescans.

Library bootstrap queries aggregate game summaries only. Clip records stay in SQLite until a detail page requests a bounded cursor page ordered by `(created_at, id)`. The matching multi-column index keeps later pages independent of their position in a large library.

## Scanning

Only direct children of the chosen root become games. Video lookup may recurse below each game folder. Symbolic links are not followed. Supported first-pass extensions are MP4, M4V, MOV, MKV, WebM, and AVI.

The scanner compares the stable path ID, file size and modification time with the index before probing. Unchanged clips reuse cached media metadata and thumbnails; changed files invalidate stale thumbnails. New and changed clips are still processed sequentially. A future persistent background queue will add bounded concurrency, retry state and progress events without weakening the database reconciliation.

## Video tools

`FfmpegTools` is the only module that invokes `ffmpeg` or `ffprobe`. It first checks the installed resource directory for bundled tools and then falls back to `PATH` for development. If neither pair is available, scanning remains functional and the UI uses generated artwork fallbacks.

Original video files are never passed as FFmpeg outputs. Thumbnail output always targets the application cache.
Probe, thumbnail and tool-detection processes have fixed timeouts and are killed and reaped if they stop responding.

## Metadata

The offline `MetadataProvider` handles zero-configuration folder matching. `OnlineMetadataService` owns all network traffic and provider-specific response models. RAWG search results require explicit user confirmation; only then are full metadata, SteamGridDB artwork and provider IDs persisted. Provider responses and images live under the application cache and manual artwork always wins.

API keys are user-owned and stored through the native credential service, never in SQLite or JSON. The frontend only receives booleans indicating whether each provider is configured. Network requests use fixed HTTPS origins, bounded timeouts and redirect limits. Artwork downloads accept only allow-listed RAWG/SteamGridDB hosts, supported image MIME types and bounded file sizes.

## Security

- Tauri commands expose purpose-specific operations instead of arbitrary filesystem reads.
- The native dialog grants runtime scope only to a user-selected folder.
- The exact library root stored in SQLite restores the asset scope at startup; no broad or serialized scope is persisted.
- The static asset scope is restricted to application data/cache paths.
- A content security policy limits images and media to local asset sources.
- Remote artwork is downloaded by Rust, validated and served through the local asset protocol; the WebView never receives provider credentials.
- Cache filenames are generated from hashes or validated identifiers, preventing path traversal.

use crate::errors::{AppError, AppResult};
use crate::metadata::{LocalCatalogProvider, MetadataProvider};
use crate::models::{CachedClip, Clip, Game};
use crate::video::FfmpegTools;
use std::collections::HashMap;
use std::ffi::OsStr;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;

const VIDEO_EXTENSIONS: &[&str] = &["mp4", "m4v", "mov", "mkv", "webm", "avi"];

#[derive(Debug)]
pub struct ScanOutput {
    pub games: Vec<Game>,
    pub complete: bool,
    pub clips_probed: usize,
    pub clips_reused: usize,
    pub thumbnails_created: usize,
    pub warnings: Vec<String>,
}

fn stable_id(path: &Path) -> String {
    blake3::hash(path.to_string_lossy().as_bytes())
        .to_hex()
        .to_string()
}

fn timestamp(time: SystemTime) -> i64 {
    time.duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(OsStr::to_str)
        .map(str::to_ascii_lowercase)
}

fn is_supported_video(path: &Path) -> bool {
    extension(path).is_some_and(|extension| VIDEO_EXTENSIONS.contains(&extension.as_str()))
}

fn display_path(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

pub fn scan_root(
    root: &Path,
    cache_path: &Path,
    ffmpeg: &FfmpegTools,
    cached_clips: &HashMap<String, CachedClip>,
) -> AppResult<ScanOutput> {
    if !root.is_dir() {
        return Err(AppError::InvalidRoot(root.to_path_buf()));
    }

    let provider = LocalCatalogProvider;
    let mut game_folders = Vec::new();
    for entry in std::fs::read_dir(root)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() && !entry.file_name().to_string_lossy().starts_with('.') {
            game_folders.push(entry);
        }
    }
    game_folders.sort_by_key(|entry| entry.file_name().to_string_lossy().to_lowercase());

    let mut games = Vec::with_capacity(game_folders.len());
    let mut clips_probed = 0;
    let mut clips_reused = 0;
    let mut thumbnails_created = 0;
    let mut warnings = Vec::new();
    let mut complete = true;

    for folder in game_folders {
        let folder_path = folder.path();
        let folder_name = folder.file_name().to_string_lossy().into_owned();
        let game_id = stable_id(&folder_path);
        let metadata = provider.lookup(&folder_name);
        let mut clips = Vec::new();

        for entry in WalkDir::new(&folder_path).follow_links(false) {
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) => {
                    complete = false;
                    warnings.push(format!("Folder could not be read completely: {error}"));
                    continue;
                }
            };
            let path = entry.path();
            if !entry.file_type().is_file() || !is_supported_video(path) {
                continue;
            }
            let Ok(file_metadata) = entry.metadata() else {
                warnings.push(format!(
                    "File information could not be read: {}",
                    display_path(path)
                ));
                continue;
            };
            let clip_id = stable_id(path);
            let ext = extension(path).unwrap_or_default();
            let created_at = timestamp(file_metadata.modified().unwrap_or(UNIX_EPOCH));
            let cached = cached_clips.get(&clip_id).filter(|clip| {
                clip.size_bytes == file_metadata.len() && clip.created_at == created_at
            });
            let video_info = if let Some(cached) = cached {
                clips_reused += 1;
                crate::video::VideoInfo {
                    duration_seconds: cached.duration_seconds,
                    width: cached.width,
                    height: cached.height,
                    codec: cached.codec.clone(),
                }
            } else {
                clips_probed += 1;
                ffmpeg.probe(path)
            };
            let thumbnail_path = cache_path.join("thumbnails").join(format!("{clip_id}.jpg"));
            if cached.is_none() && thumbnail_path.exists() {
                let _ = std::fs::remove_file(&thumbnail_path);
            }
            let thumbnail_created = ffmpeg.thumbnail(path, thumbnail_path.clone());
            if thumbnail_created {
                thumbnails_created += 1
            }
            let thumbnail = thumbnail_path
                .exists()
                .then(|| display_path(&thumbnail_path));
            let compatible = matches!(ext.as_str(), "mp4" | "m4v" | "mov")
                && video_info
                    .codec
                    .as_deref()
                    .is_none_or(|codec| codec == "h264");

            clips.push(Clip {
                id: clip_id,
                game_id: game_id.clone(),
                path: display_path(path),
                file_name: path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .into_owned(),
                extension: ext,
                size_bytes: file_metadata.len(),
                created_at,
                duration_seconds: video_info.duration_seconds,
                width: video_info.width,
                height: video_info.height,
                codec: video_info.codec,
                compatible,
                thumbnail_path: thumbnail,
            });
        }

        clips.sort_by_key(|clip| std::cmp::Reverse(clip.created_at));
        let clip_count = clips.len();
        games.push(Game {
            id: game_id,
            folder_path: display_path(&folder_path),
            folder_name,
            title: metadata.title,
            description: metadata.description,
            genres: metadata.genres,
            release_year: metadata.release_year,
            metadata_status: metadata.status,
            accent_start: metadata.accent_start,
            accent_end: metadata.accent_end,
            metadata_provider: None,
            metadata_provider_id: None,
            artwork_provider: None,
            artwork_provider_id: None,
            poster_path: None,
            hero_path: None,
            newest_clip_at: clips.first().map(|clip| clip.created_at),
            clips,
            clip_count,
        });
    }

    games.sort_by_key(|game| std::cmp::Reverse(game.newest_clip_at.unwrap_or_default()));
    Ok(ScanOutput {
        games,
        complete,
        clips_probed,
        clips_reused,
        thumbnails_created,
        warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognizes_supported_extensions_case_insensitively() {
        assert!(is_supported_video(Path::new("Replay.MP4")));
        assert!(is_supported_video(Path::new("Replay.mkv")));
        assert!(!is_supported_video(Path::new("notes.txt")));
    }

    #[test]
    fn scan_groups_clips_by_direct_parent_game_folder() {
        let directory = tempfile::tempdir().expect("temp directory");
        let root = directory.path().join("clips");
        let game = root.join("Overwatch 2");
        std::fs::create_dir_all(&game).expect("create game folder");
        std::fs::write(game.join("Replay.mp4"), b"not a real video").expect("write fixture");
        let output = scan_root(
            &root,
            &directory.path().join("cache"),
            &FfmpegTools::unavailable(),
            &HashMap::new(),
        )
        .expect("scan succeeds");
        assert_eq!(output.games.len(), 1);
        assert_eq!(output.games[0].clips.len(), 1);
        assert_eq!(output.games[0].title, "Overwatch 2");
    }

    #[test]
    fn unchanged_clip_reuses_cached_probe_metadata() {
        let directory = tempfile::tempdir().expect("temp directory");
        let root = directory.path().join("clips");
        let game = root.join("Overwatch 2");
        let replay = game.join("Replay.mp4");
        std::fs::create_dir_all(&game).expect("create game folder");
        std::fs::write(&replay, b"stable fixture").expect("write fixture");
        let metadata = replay.metadata().expect("metadata");
        let mut cache = HashMap::new();
        cache.insert(
            stable_id(&replay),
            CachedClip {
                size_bytes: metadata.len(),
                created_at: timestamp(metadata.modified().expect("modified")),
                duration_seconds: Some(42.5),
                width: Some(1920),
                height: Some(1080),
                codec: Some("h264".to_owned()),
            },
        );

        let output = scan_root(
            &root,
            &directory.path().join("cache"),
            &FfmpegTools::unavailable(),
            &cache,
        )
        .expect("scan succeeds");

        assert_eq!(output.clips_reused, 1);
        assert_eq!(output.clips_probed, 0);
        assert_eq!(output.games[0].clips[0].duration_seconds, Some(42.5));
    }
}

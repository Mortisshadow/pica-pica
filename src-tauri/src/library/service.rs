use super::scan_root;
use crate::database::Database;
use crate::errors::AppResult;
use crate::models::ScanResult;
use crate::video::FfmpegTools;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn execute_scan(
    database: &Database,
    root: &Path,
    ffmpeg: &FfmpegTools,
) -> AppResult<ScanResult> {
    let cached_clips = database.cached_clips()?;
    let output = scan_root(root, database.cache_path(), ffmpeg, &cached_clips)?;
    let games_discovered = output.games.len();
    let clips_discovered = output.games.iter().map(|game| game.clips.len()).sum();
    let scanned_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;
    database.persist_scan(root, &output.games, scanned_at, output.complete)?;
    Ok(ScanResult {
        library: database.load_library(ffmpeg.available, &ffmpeg.source)?,
        games_discovered,
        clips_discovered,
        clips_probed: output.clips_probed,
        clips_reused: output.clips_reused,
        thumbnails_created: output.thumbnails_created,
        warnings: output.warnings,
    })
}

use crate::database::Database;
use crate::errors::{AppError, AppResult};
use crate::library::execute_scan;
use crate::metadata::{OnlineMetadataService, ProviderKey};
use crate::models::{
    ApiKeyUpdate, BootstrapState, ClipCursor, ClipPage, CustomArtworkUpdate, LibrarySnapshot,
    MetadataSearchResult, MetadataSelection, MetadataUpdate, ProviderSettings, ScanResult,
};
use crate::video::FfmpegTools;
use std::path::{Path, PathBuf};
use tauri::{Manager, State};

#[derive(Debug)]
pub struct AppState {
    pub database: Database,
    pub ffmpeg: FfmpegTools,
    pub online_metadata: OnlineMetadataService,
}

#[tauri::command]
pub fn get_bootstrap(state: State<'_, AppState>) -> AppResult<BootstrapState> {
    let root_path = state.database.root_path()?;
    let library = if root_path.is_some() {
        Some(
            state
                .database
                .load_library(state.ffmpeg.available, &state.ffmpeg.source)?,
        )
    } else {
        None
    };
    Ok(BootstrapState {
        configured: root_path.is_some(),
        root_path: root_path.map(|path| path.to_string_lossy().into_owned()),
        cache_path: state.database.cache_path().to_string_lossy().into_owned(),
        ffmpeg_available: state.ffmpeg.available,
        ffmpeg_source: state.ffmpeg.source.clone(),
        library,
    })
}

#[tauri::command]
pub fn get_library(state: State<'_, AppState>) -> AppResult<LibrarySnapshot> {
    state
        .database
        .load_library(state.ffmpeg.available, &state.ffmpeg.source)
}

#[tauri::command]
pub async fn get_game_clips(
    game_id: String,
    cursor: Option<ClipCursor>,
    limit: usize,
    state: State<'_, AppState>,
) -> AppResult<ClipPage> {
    if game_id.len() > 128 || !(1..=100).contains(&limit) {
        return Err(AppError::InvalidInput(
            "Invalid clip page request.".to_owned(),
        ));
    }
    let database = state.database.clone();
    tauri::async_runtime::spawn_blocking(move || {
        database.load_clip_page(&game_id, cursor.as_ref(), limit)
    })
    .await
    .map_err(|error| AppError::Task(error.to_string()))?
}

#[tauri::command]
pub async fn configure_library(
    root_path: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> AppResult<ScanResult> {
    let root = PathBuf::from(root_path);
    let scan_root = root.clone();
    let database = state.database.clone();
    let ffmpeg = state.ffmpeg.clone();
    let result =
        tauri::async_runtime::spawn_blocking(move || execute_scan(&database, &scan_root, &ffmpeg))
            .await
            .map_err(|error| AppError::Task(error.to_string()))??;
    app.asset_protocol_scope()
        .allow_directory(root, true)
        .map_err(|error| AppError::InvalidInput(error.to_string()))?;
    Ok(result)
}

#[tauri::command]
pub async fn scan_library(state: State<'_, AppState>) -> AppResult<ScanResult> {
    let database = state.database.clone();
    let root = database.root_path()?.ok_or(AppError::NotConfigured)?;
    let ffmpeg = state.ffmpeg.clone();
    tauri::async_runtime::spawn_blocking(move || execute_scan(&database, &root, &ffmpeg))
        .await
        .map_err(|error| AppError::Task(error.to_string()))?
}

#[tauri::command]
pub fn update_game_metadata(
    update: MetadataUpdate,
    state: State<'_, AppState>,
) -> AppResult<LibrarySnapshot> {
    state.database.update_metadata(&update)?;
    state
        .database
        .load_library(state.ffmpeg.available, &state.ffmpeg.source)
}

#[tauri::command]
pub fn get_provider_settings(state: State<'_, AppState>) -> ProviderSettings {
    state.online_metadata.settings()
}

#[tauri::command]
pub fn save_provider_api_key(
    update: ApiKeyUpdate,
    state: State<'_, AppState>,
) -> AppResult<ProviderSettings> {
    state
        .online_metadata
        .save_key(ProviderKey::parse(&update.provider)?, &update.api_key)
}

#[tauri::command]
pub async fn search_game_metadata(
    query: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<MetadataSearchResult>> {
    let service = state.online_metadata.clone();
    tauri::async_runtime::spawn_blocking(move || service.search_rawg(&query))
        .await
        .map_err(|error| AppError::Task(error.to_string()))?
}

#[tauri::command]
pub async fn apply_game_metadata(
    selection: MetadataSelection,
    state: State<'_, AppState>,
) -> AppResult<LibrarySnapshot> {
    let service = state.online_metadata.clone();
    let database = state.database.clone();
    let ffmpeg_available = state.ffmpeg.available;
    let ffmpeg_source = state.ffmpeg.source.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let update = service.resolve_rawg(&selection.game_id, &selection.rawg_id)?;
        database.apply_provider_metadata(&update)?;
        database.load_library(ffmpeg_available, &ffmpeg_source)
    })
    .await
    .map_err(|error| AppError::Task(error.to_string()))?
}

#[tauri::command]
pub async fn set_custom_artwork(
    update: CustomArtworkUpdate,
    state: State<'_, AppState>,
) -> AppResult<LibrarySnapshot> {
    let database = state.database.clone();
    let ffmpeg_available = state.ffmpeg.available;
    let ffmpeg_source = state.ffmpeg.source.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if !matches!(update.kind.as_str(), "poster" | "hero") {
            return Err(AppError::InvalidInput("Unknown artwork type.".to_owned()));
        }
        if update.game_id.len() > 128
            || !update
                .game_id
                .chars()
                .all(|character| character.is_ascii_alphanumeric() || character == '-')
        {
            return Err(AppError::InvalidInput("Invalid game ID.".to_owned()));
        }
        let source = PathBuf::from(&update.source_path);
        let source = source
            .canonicalize()
            .map_err(|_| AppError::InvalidInput("The image file was not found.".to_owned()))?;
        if !source.is_file() {
            return Err(AppError::InvalidInput(
                "The selected artwork is not a file.".to_owned(),
            ));
        }
        let size = source.metadata()?.len();
        if size > 25 * 1024 * 1024 {
            return Err(AppError::InvalidInput(
                "Artwork must not exceed 25 MB.".to_owned(),
            ));
        }
        let bytes = std::fs::read(&source)?;
        let extension = safe_image_extension(&source, &bytes)?;
        let hash = blake3::hash(&bytes).to_hex();
        let directory = database.cache_path().join("artwork").join("manual");
        std::fs::create_dir_all(&directory)?;
        let destination = directory.join(format!(
            "{}-{}-{}.{}",
            update.game_id,
            update.kind,
            &hash[..12],
            extension
        ));
        if !destination.exists() {
            std::fs::write(&destination, bytes)?;
        }
        database.set_custom_artwork(&update.game_id, &update.kind, &destination)?;
        database.load_library(ffmpeg_available, &ffmpeg_source)
    })
    .await
    .map_err(|error| AppError::Task(error.to_string()))?
}

fn safe_image_extension(path: &Path, bytes: &[u8]) -> AppResult<&'static str> {
    let extension = match path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .as_deref()
    {
        Some("jpg" | "jpeg") if bytes.starts_with(&[0xff, 0xd8, 0xff]) => Some("jpg"),
        Some("png") if bytes.starts_with(b"\x89PNG\r\n\x1a\n") => Some("png"),
        Some("webp") if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") => {
            Some("webp")
        }
        _ => None,
    };
    extension.ok_or_else(|| {
        AppError::InvalidInput("Valid JPG, PNG, and WebP files are supported.".to_owned())
    })
}

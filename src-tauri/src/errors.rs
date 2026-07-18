use serde::ser::{Serialize, Serializer};
use std::path::PathBuf;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("The library folder is not configured.")]
    NotConfigured,
    #[error("The selected path is not a readable folder: {0}")]
    InvalidRoot(PathBuf),
    #[error("File system error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Background task failed: {0}")]
    Task(String),
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    #[error("Online service failed: {0}")]
    Network(String),
    #[error("Secure credential store failed: {0}")]
    SecretStore(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;

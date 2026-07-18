use serde::ser::{Serialize, Serializer};
use std::path::PathBuf;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Der Bibliotheksordner ist nicht eingerichtet.")]
    NotConfigured,
    #[error("Der ausgewählte Pfad ist kein lesbarer Ordner: {0}")]
    InvalidRoot(PathBuf),
    #[error("Dateisystemfehler: {0}")]
    Io(#[from] std::io::Error),
    #[error("Datenbankfehler: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Hintergrundaufgabe fehlgeschlagen: {0}")]
    Task(String),
    #[error("Ungültige Eingabe: {0}")]
    InvalidInput(String),
    #[error("Onlinedienst fehlgeschlagen: {0}")]
    Network(String),
    #[error("Sicherer Schlüsselspeicher fehlgeschlagen: {0}")]
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

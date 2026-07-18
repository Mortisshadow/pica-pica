use crate::errors::{AppError, AppResult};
use keyring::v1::Entry;

const SERVICE: &str = "app.picapica.desktop";

#[derive(Debug, Clone, Copy)]
pub enum ProviderKey {
    Rawg,
    SteamGridDb,
}

impl ProviderKey {
    pub fn parse(value: &str) -> AppResult<Self> {
        match value {
            "rawg" => Ok(Self::Rawg),
            "steamgriddb" => Ok(Self::SteamGridDb),
            _ => Err(AppError::InvalidInput(
                "Unknown metadata provider.".to_owned(),
            )),
        }
    }

    fn account(self) -> &'static str {
        match self {
            Self::Rawg => "rawg-api-key",
            Self::SteamGridDb => "steamgriddb-api-key",
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct SecretStore;

impl SecretStore {
    fn entry(provider: ProviderKey) -> AppResult<Entry> {
        Entry::new(SERVICE, provider.account())
            .map_err(|error| AppError::SecretStore(error.to_string()))
    }

    pub fn read(&self, provider: ProviderKey) -> Option<String> {
        Self::entry(provider)
            .ok()?
            .get_password()
            .ok()
            .filter(|value| !value.trim().is_empty())
    }

    pub fn write(&self, provider: ProviderKey, value: &str) -> AppResult<()> {
        let value = value.trim();
        if value.len() > 512 {
            return Err(AppError::InvalidInput(
                "The API key is unusually long.".to_owned(),
            ));
        }
        Self::entry(provider)?
            .set_password(value)
            .map_err(|error| AppError::SecretStore(error.to_string()))
    }
}

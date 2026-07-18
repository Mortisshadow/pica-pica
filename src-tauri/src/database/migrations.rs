use crate::errors::AppResult;
use rusqlite::Connection;

const INITIAL_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY NOT NULL,
  folder_path TEXT NOT NULL UNIQUE,
  folder_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  genres_json TEXT NOT NULL DEFAULT '[]',
  release_year INTEGER,
  metadata_status TEXT NOT NULL DEFAULT 'unresolved',
  accent_start TEXT NOT NULL,
  accent_end TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS clips (
  id TEXT PRIMARY KEY NOT NULL,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  extension TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  duration_seconds REAL,
  width INTEGER,
  height INTEGER,
  codec TEXT,
  compatible INTEGER NOT NULL DEFAULT 0,
  thumbnail_path TEXT,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS clips_game_created_idx ON clips(game_id, created_at DESC);
PRAGMA user_version = 1;
"#;

const PROVIDER_SCHEMA: &str = r#"
ALTER TABLE games ADD COLUMN metadata_provider TEXT;
ALTER TABLE games ADD COLUMN metadata_provider_id TEXT;
ALTER TABLE games ADD COLUMN artwork_provider TEXT;
ALTER TABLE games ADD COLUMN artwork_provider_id TEXT;
ALTER TABLE games ADD COLUMN poster_path TEXT;
ALTER TABLE games ADD COLUMN hero_path TEXT;
PRAGMA user_version = 2;
"#;

const PAGINATION_SCHEMA: &str = r#"
CREATE INDEX IF NOT EXISTS clips_game_created_id_idx ON clips(game_id, created_at DESC, id DESC);
PRAGMA user_version = 3;
"#;

pub fn migrate(connection: &Connection) -> AppResult<()> {
    let version: i64 = connection.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    if version < 1 {
        connection.execute_batch(INITIAL_SCHEMA)?;
    }
    let version: i64 = connection.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    if version < 2 {
        connection.execute_batch(PROVIDER_SCHEMA)?;
    }
    let version: i64 = connection.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    if version < 3 {
        connection.execute_batch(PAGINATION_SCHEMA)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migration_is_idempotent() {
        let connection = Connection::open_in_memory().expect("database");
        migrate(&connection).expect("first migration");
        migrate(&connection).expect("second migration");
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("version");
        assert_eq!(version, 3);
    }
}

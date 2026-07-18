use crate::models::MetadataStatus;

#[derive(Debug, Clone)]
pub struct MetadataMatch {
    pub title: String,
    pub description: Option<String>,
    pub genres: Vec<String>,
    pub release_year: Option<u16>,
    pub status: MetadataStatus,
    pub accent_start: String,
    pub accent_end: String,
}

pub trait MetadataProvider: Send + Sync {
    fn lookup(&self, folder_name: &str) -> MetadataMatch;
}

pub struct LocalCatalogProvider;

struct CatalogEntry {
    names: &'static [&'static str],
    title: &'static str,
    description: &'static str,
    genres: &'static [&'static str],
    year: u16,
    colors: (&'static str, &'static str),
}

const CATALOG: &[CatalogEntry] = &[
    CatalogEntry {
        names: &["overwatch 2", "overwatch2"],
        title: "Overwatch 2",
        description: "Ein teambasierter Hero-Shooter, in dem jede Entscheidung und jede Sekunde den Ausgang des Matches verändern kann.",
        genres: &["Shooter", "Team", "Competitive"],
        year: 2022,
        colors: ("#ef6a35", "#273a67"),
    },
    CatalogEntry {
        names: &["valorant"],
        title: "VALORANT",
        description: "Präzises Gunplay trifft auf einzigartige Agentenfähigkeiten in taktischen Fünf-gegen-Fünf-Runden.",
        genres: &["Tactical", "Shooter"],
        year: 2020,
        colors: ("#ff4655", "#171b2c"),
    },
    CatalogEntry {
        names: &["counter strike 2", "cs2", "counterstrike 2"],
        title: "Counter-Strike 2",
        description: "Der kompetitive Taktik-Shooter, in dem Präzision, Teamplay und Nervenstärke zählen.",
        genres: &["Tactical", "Shooter"],
        year: 2023,
        colors: ("#d89535", "#182c43"),
    },
    CatalogEntry {
        names: &["minecraft", "minecraft java edition"],
        title: "Minecraft",
        description: "Eine Welt aus Blöcken, grenzenlosen Ideen und überraschenden Momenten.",
        genres: &["Sandbox", "Adventure"],
        year: 2011,
        colors: ("#55a144", "#273a23"),
    },
    CatalogEntry {
        names: &["rocket league"],
        title: "Rocket League",
        description: "Rasantes Autoball-Spiel mit spektakulären Toren, Aerials und knappen Overtime-Momenten.",
        genres: &["Sports", "Competitive"],
        year: 2015,
        colors: ("#1488f4", "#f07820"),
    },
    CatalogEntry {
        names: &["fortnite"],
        title: "Fortnite",
        description: "Battle Royale, kreative Welten und ständig neue Erlebnisse in einem lebendigen Universum.",
        genres: &["Battle Royale", "Action"],
        year: 2017,
        colors: ("#7457d8", "#2b98d2"),
    },
    CatalogEntry {
        names: &["apex legends", "apex"],
        title: "Apex Legends",
        description: "Ein schneller Squad-basierter Battle-Royale-Shooter mit einzigartigen Legenden.",
        genres: &["Battle Royale", "Shooter"],
        year: 2019,
        colors: ("#d94c3b", "#29221f"),
    },
    CatalogEntry {
        names: &["league of legends", "lol"],
        title: "League of Legends",
        description: "Strategische Fünf-gegen-Fünf-Matches mit Champions, Teamplay und entscheidenden Plays.",
        genres: &["MOBA", "Strategy"],
        year: 2009,
        colors: ("#0d91a6", "#17233e"),
    },
];

fn normalize(value: &str) -> String {
    value
        .to_lowercase()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character
            } else {
                ' '
            }
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

impl MetadataProvider for LocalCatalogProvider {
    fn lookup(&self, folder_name: &str) -> MetadataMatch {
        let normalized = normalize(folder_name);
        if let Some(entry) = CATALOG
            .iter()
            .find(|entry| entry.names.iter().any(|name| normalize(name) == normalized))
        {
            return MetadataMatch {
                title: entry.title.to_owned(),
                description: Some(entry.description.to_owned()),
                genres: entry
                    .genres
                    .iter()
                    .map(|genre| (*genre).to_owned())
                    .collect(),
                release_year: Some(entry.year),
                status: MetadataStatus::Matched,
                accent_start: entry.colors.0.to_owned(),
                accent_end: entry.colors.1.to_owned(),
            };
        }

        MetadataMatch {
            title: folder_name.to_owned(),
            description: None,
            genres: Vec::new(),
            release_year: None,
            status: MetadataStatus::Unresolved,
            accent_start: "#565b68".to_owned(),
            accent_end: "#17191e".to_owned(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_known_folder_names_case_insensitively() {
        let result = LocalCatalogProvider.lookup("OVERWATCH_2");
        assert_eq!(result.title, "Overwatch 2");
        assert_eq!(result.status, MetadataStatus::Matched);
    }

    #[test]
    fn leaves_unknown_games_unresolved() {
        let result = LocalCatalogProvider.lookup("My brand new game");
        assert_eq!(result.status, MetadataStatus::Unresolved);
        assert_eq!(result.title, "My brand new game");
    }
}

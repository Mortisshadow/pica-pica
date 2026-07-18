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
        description: "A team-based hero shooter where every decision and every second can change the outcome of a match.",
        genres: &["Shooter", "Team", "Competitive"],
        year: 2022,
        colors: ("#ef6a35", "#273a67"),
    },
    CatalogEntry {
        names: &["valorant"],
        title: "VALORANT",
        description: "Precise gunplay meets unique agent abilities in tactical five-versus-five rounds.",
        genres: &["Tactical", "Shooter"],
        year: 2020,
        colors: ("#ff4655", "#171b2c"),
    },
    CatalogEntry {
        names: &["counter strike 2", "cs2", "counterstrike 2"],
        title: "Counter-Strike 2",
        description: "A competitive tactical shooter where precision, teamwork, and composure matter.",
        genres: &["Tactical", "Shooter"],
        year: 2023,
        colors: ("#d89535", "#182c43"),
    },
    CatalogEntry {
        names: &["minecraft", "minecraft java edition"],
        title: "Minecraft",
        description: "A world of blocks, limitless ideas, and unexpected moments.",
        genres: &["Sandbox", "Adventure"],
        year: 2011,
        colors: ("#55a144", "#273a23"),
    },
    CatalogEntry {
        names: &["rocket league"],
        title: "Rocket League",
        description: "Fast-paced car football with spectacular goals, aerials, and close overtime moments.",
        genres: &["Sports", "Competitive"],
        year: 2015,
        colors: ("#1488f4", "#f07820"),
    },
    CatalogEntry {
        names: &["fortnite"],
        title: "Fortnite",
        description: "Battle royale, creative worlds, and constantly evolving experiences in a vibrant universe.",
        genres: &["Battle Royale", "Action"],
        year: 2017,
        colors: ("#7457d8", "#2b98d2"),
    },
    CatalogEntry {
        names: &["apex legends", "apex"],
        title: "Apex Legends",
        description: "A fast squad-based battle royale shooter with unique legends.",
        genres: &["Battle Royale", "Shooter"],
        year: 2019,
        colors: ("#d94c3b", "#29221f"),
    },
    CatalogEntry {
        names: &["league of legends", "lol"],
        title: "League of Legends",
        description: "Strategic five-versus-five matches with champions, teamwork, and decisive plays.",
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

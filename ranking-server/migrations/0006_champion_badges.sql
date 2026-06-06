CREATE TABLE IF NOT EXISTS ranking_champions (
  season_id TEXT PRIMARY KEY,
  season_label TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL,
  awarded_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS player_champion_badges (
  device_id TEXT PRIMARY KEY,
  champion_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  device_id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  nickname_season_id TEXT NOT NULL DEFAULT 'legacy',
  selected_badge TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scores (
  device_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  season_id TEXT NOT NULL DEFAULT 'legacy',
  score INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (device_id, job_id)
);

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

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

CREATE TABLE IF NOT EXISTS ranking_names (
  season_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (season_id, device_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ranking_names_season_nickname
ON ranking_names (season_id, nickname);

CREATE TABLE IF NOT EXISTS ranking_scores (
  season_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (season_id, device_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_ranking_scores_season_job_score
ON ranking_scores (season_id, job_id, score DESC, updated_at ASC);

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

CREATE TABLE IF NOT EXISTS apple_account_links (
  apple_user_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  linked_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_apple_account_links_device_id
ON apple_account_links (device_id);

CREATE TABLE IF NOT EXISTS apple_account_backups (
  apple_user_id TEXT PRIMARY KEY,
  backup_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

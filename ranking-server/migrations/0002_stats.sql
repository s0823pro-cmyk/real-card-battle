CREATE TABLE IF NOT EXISTS player_stats (
  device_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  play_count INTEGER NOT NULL DEFAULT 0,
  win_count INTEGER NOT NULL DEFAULT 0,
  defeat_count INTEGER NOT NULL DEFAULT 0,
  total_kills INTEGER NOT NULL DEFAULT 0,
  total_gold INTEGER NOT NULL DEFAULT 0,
  max_win_streak INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (device_id, job_id)
);

CREATE TABLE IF NOT EXISTS card_usage (
  device_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (device_id, card_id)
);

CREATE TABLE IF NOT EXISTS enemy_kills (
  device_id TEXT NOT NULL,
  enemy_id TEXT NOT NULL,
  kill_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (device_id, enemy_id)
);

CREATE TABLE IF NOT EXISTS codes (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT,
  created_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO codes (code, type, payload, created_at)
VALUES ('JOBLESS_ADMIN_2024', 'admin', NULL, 0);

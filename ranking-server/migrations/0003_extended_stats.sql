ALTER TABLE player_stats ADD COLUMN total_play_time INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS area_stats (
  device_id TEXT NOT NULL,
  area INTEGER NOT NULL,
  reached_count INTEGER NOT NULL DEFAULT 0,
  cleared_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (device_id, area)
);

CREATE TABLE IF NOT EXISTS card_combos (
  combo_key TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (combo_key)
);

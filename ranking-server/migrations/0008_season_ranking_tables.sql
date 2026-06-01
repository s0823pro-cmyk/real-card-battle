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

INSERT OR IGNORE INTO ranking_names (season_id, device_id, nickname, created_at, updated_at)
SELECT nickname_season_id, device_id, nickname, created_at, created_at
FROM players
WHERE nickname_season_id IS NOT NULL
  AND nickname_season_id != ''
  AND nickname IS NOT NULL
  AND nickname != '';

INSERT OR IGNORE INTO ranking_scores (season_id, device_id, job_id, score, updated_at)
SELECT season_id, device_id, job_id, score, updated_at
FROM scores
WHERE season_id IS NOT NULL
  AND season_id != '';

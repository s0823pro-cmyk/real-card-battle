ALTER TABLE players ADD COLUMN nickname_season_id TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE scores ADD COLUMN season_id TEXT NOT NULL DEFAULT 'legacy';
CREATE INDEX IF NOT EXISTS idx_scores_season_job_score ON scores (season_id, job_id, score DESC, updated_at ASC);
CREATE INDEX IF NOT EXISTS idx_players_nickname_season ON players (nickname_season_id, nickname);

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

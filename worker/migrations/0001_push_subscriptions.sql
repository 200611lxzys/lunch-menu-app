CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  subscription_json TEXT NOT NULL,
  time_zone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  send_hour INTEGER NOT NULL DEFAULT 8 CHECK (send_hour BETWEEN 0 AND 23),
  created_at TEXT NOT NULL,
  last_sent_local_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_schedule
  ON push_subscriptions (time_zone, send_hour, last_sent_local_date);

-- 玩家身分。房間仍然喺 Durable Object；呢度只存帳戶。
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  friend_code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE UNIQUE INDEX players_email_unique ON players(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX players_friend_code_unique ON players(friend_code);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  player_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  device_summary TEXT NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX sessions_player_idx ON sessions(player_id);

CREATE TABLE email_links (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  player_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE INDEX email_links_email_idx ON email_links(email, created_at);

CREATE TABLE email_send_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX email_send_email_idx ON email_send_attempts(email, created_at);
CREATE INDEX email_send_client_idx ON email_send_attempts(client_hash, created_at);

CREATE TABLE imports (
  player_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, content_hash)
);

CREATE TABLE player_rooms (
  player_id TEXT NOT NULL,
  room_code TEXT NOT NULL,
  seat INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (room_code, seat)
);

CREATE INDEX player_rooms_player_idx ON player_rooms(player_id);

-- 排位分數（登入帳戶同步；本機匿名仍用 localStorage）
CREATE TABLE player_ranked (
  player_id TEXT PRIMARY KEY,
  rating INTEGER NOT NULL,
  ranked_games INTEGER NOT NULL,
  peak_rating INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- 好友請求／關係（對齊 design/friends-system.md F1）
CREATE TABLE friendships (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  addressee_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (requester_id) REFERENCES players(id),
  FOREIGN KEY (addressee_id) REFERENCES players(id)
);

CREATE UNIQUE INDEX friendships_pair_unique
  ON friendships(requester_id, addressee_id);

CREATE INDEX friendships_addressee_status_idx
  ON friendships(addressee_id, status);

CREATE INDEX friendships_requester_status_idx
  ON friendships(requester_id, status);

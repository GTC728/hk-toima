-- F2：在線狀態 + 約局邀請
ALTER TABLE players ADD COLUMN last_seen_at INTEGER;

CREATE TABLE friend_challenges (
  id TEXT PRIMARY KEY,
  friendship_id TEXT NOT NULL,
  challenger_id TEXT NOT NULL,
  challengee_id TEXT NOT NULL,
  room_code TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (friendship_id) REFERENCES friendships(id),
  FOREIGN KEY (challenger_id) REFERENCES players(id),
  FOREIGN KEY (challengee_id) REFERENCES players(id)
);

CREATE INDEX friend_challenges_challengee_status_idx
  ON friend_challenges(challengee_id, status);

CREATE INDEX friend_challenges_challenger_status_idx
  ON friend_challenges(challenger_id, status);

CREATE INDEX friend_challenges_room_idx
  ON friend_challenges(room_code);

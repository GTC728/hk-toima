import type { CareerImport } from './policy'
import { canonicalCareer } from './policy'
import {
  deviceSummary,
  extendExpiry,
  initialExpiry,
  randomFriendCode,
  randomToken,
  readSessionCookie,
  sessionUsable,
  sha256Hex,
} from './token'

export interface PlayerRow {
  id: string
  display_name: string
  email: string | null
  friend_code: string
  created_at: number
  deleted_at: number | null
  last_seen_at: number | null
}

export interface SessionRow {
  id: string
  token_hash: string
  player_id: string
  created_at: number
  expires_at: number
  device_summary: string
  revoked_at: number | null
}

export interface EmailLinkRow {
  token_hash: string
  email: string
  player_id: string
  created_at: number
  expires_at: number
  used_at: number | null
}

export interface ActiveSession {
  token: string
  session: SessionRow
  player: PlayerRow
}

const PLAYER_COLS =
  'id, display_name, email, friend_code, created_at, deleted_at, last_seen_at'

/** 最近活動視為「網上」 */
export const PRESENCE_ONLINE_MS = 5 * 60 * 1000
/** player_rooms 近期有紀錄視為「對局中」 */
export const PRESENCE_INGAME_MS = 90 * 60 * 1000
export const CHALLENGE_TTL_MS = 10 * 60 * 1000
export const MAX_PENDING_CHALLENGES = 5

export type PresenceKind = 'offline' | 'online' | 'ingame'

export function presenceOf(
  lastSeenAt: number | null | undefined,
  inGameAt: number | null | undefined,
  now: number,
): PresenceKind {
  if (inGameAt != null && now - inGameAt <= PRESENCE_INGAME_MS) return 'ingame'
  if (lastSeenAt != null && now - lastSeenAt <= PRESENCE_ONLINE_MS) return 'online'
  return 'offline'
}

function isUnique(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /unique/i.test(msg)
}

export async function createAnonymousPlayer(
  db: D1Database,
  now: number,
): Promise<PlayerRow> {
  let last: unknown = null
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = crypto.randomUUID()
    const friend = randomFriendCode()
    try {
      await db
        .prepare(
          `INSERT INTO players
             (id, display_name, email, friend_code, created_at, deleted_at, last_seen_at)
           VALUES (?, '玩家', NULL, ?, ?, NULL, ?)`,
        )
        .bind(id, friend, now, now)
        .run()
      return {
        id,
        display_name: '玩家',
        email: null,
        friend_code: friend,
        created_at: now,
        deleted_at: null,
        last_seen_at: now,
      }
    } catch (err) {
      last = err
      if (!isUnique(err)) throw err
    }
  }
  throw last instanceof Error ? last : new Error('could not create player')
}

export async function getPlayer(
  db: D1Database,
  id: string,
): Promise<PlayerRow | null> {
  return db
    .prepare(`SELECT ${PLAYER_COLS} FROM players WHERE id = ?`)
    .bind(id)
    .first<PlayerRow>()
}

export async function getPlayerByEmail(
  db: D1Database,
  email: string,
): Promise<PlayerRow | null> {
  return db
    .prepare(
      `SELECT ${PLAYER_COLS} FROM players WHERE email = ? AND deleted_at IS NULL`,
    )
    .bind(email)
    .first<PlayerRow>()
}

export async function importCount(db: D1Database, playerId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM imports WHERE player_id = ?')
    .bind(playerId)
    .first<{ n: number }>()
  return row?.n ?? 0
}

export async function createSession(
  db: D1Database,
  playerId: string,
  userAgent: string | null,
  now: number,
): Promise<{ token: string; session: SessionRow }> {
  const token = randomToken()
  const tokenHash = await sha256Hex(token)
  const session: SessionRow = {
    id: crypto.randomUUID(),
    token_hash: tokenHash,
    player_id: playerId,
    created_at: now,
    expires_at: initialExpiry(now),
    device_summary: deviceSummary(userAgent),
    revoked_at: null,
  }
  await db
    .prepare(
      `INSERT INTO sessions
        (id, token_hash, player_id, created_at, expires_at, device_summary, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    )
    .bind(
      session.id,
      session.token_hash,
      session.player_id,
      session.created_at,
      session.expires_at,
      session.device_summary,
    )
    .run()
  return { token, session }
}

export async function loadActiveSession(
  db: D1Database,
  request: Request,
  now: number,
): Promise<ActiveSession | null> {
  const token = readSessionCookie(request.headers.get('cookie'))
  if (!token) return null
  const tokenHash = await sha256Hex(token)
  const session = await db
    .prepare(
      `SELECT id, token_hash, player_id, created_at, expires_at, device_summary, revoked_at
       FROM sessions WHERE token_hash = ?`,
    )
    .bind(tokenHash)
    .first<SessionRow>()
  if (!session) return null
  if (
    !sessionUsable({
      revokedAt: session.revoked_at,
      expiresAt: session.expires_at,
      now,
    })
  ) {
    return null
  }
  const player = await getPlayer(db, session.player_id)
  if (!player || player.deleted_at != null) return null

  const nextExpiry = extendExpiry(session.created_at, now, session.expires_at)
  if (nextExpiry != null && nextExpiry !== session.expires_at) {
    await db
      .prepare(
        `UPDATE sessions SET expires_at = ?
         WHERE token_hash = ? AND revoked_at IS NULL`,
      )
      .bind(nextExpiry, session.token_hash)
      .run()
    session.expires_at = nextExpiry
  }
  return { token, session, player }
}

export async function updateDisplayName(
  db: D1Database,
  playerId: string,
  displayName: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE players SET display_name = ?
       WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(displayName, playerId)
    .run()
}

export async function listSessions(
  db: D1Database,
  playerId: string,
): Promise<SessionRow[]> {
  const result = await db
    .prepare(
      `SELECT id, token_hash, player_id, created_at, expires_at, device_summary, revoked_at
       FROM sessions WHERE player_id = ? ORDER BY created_at DESC`,
    )
    .bind(playerId)
    .all<SessionRow>()
  return result.results
}

export async function revokeSession(
  db: D1Database,
  tokenHash: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE sessions SET revoked_at = ?
       WHERE token_hash = ? AND revoked_at IS NULL`,
    )
    .bind(now, tokenHash)
    .run()
}

export async function revokeAllSessions(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE sessions SET revoked_at = ?
       WHERE player_id = ? AND revoked_at IS NULL`,
    )
    .bind(now, playerId)
    .run()
}

export async function countSendAttempts(
  db: D1Database,
  email: string,
  clientHash: string,
  since: number,
): Promise<{ email: number; client: number }> {
  const emailRow = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM email_send_attempts
       WHERE email = ? AND created_at >= ?`,
    )
    .bind(email, since)
    .first<{ n: number }>()
  const clientRow = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM email_send_attempts
       WHERE client_hash = ? AND created_at >= ?`,
    )
    .bind(clientHash, since)
    .first<{ n: number }>()
  return { email: emailRow?.n ?? 0, client: clientRow?.n ?? 0 }
}

export async function recordSendAttempt(
  db: D1Database,
  email: string,
  clientHash: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO email_send_attempts (email, client_hash, created_at)
       VALUES (?, ?, ?)`,
    )
    .bind(email, clientHash, now)
    .run()
}

export async function createEmailLink(
  db: D1Database,
  input: {
    tokenHash: string
    email: string
    playerId: string
    now: number
    expiresAt: number
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO email_links
        (token_hash, email, player_id, created_at, expires_at, used_at)
       VALUES (?, ?, ?, ?, ?, NULL)`,
    )
    .bind(
      input.tokenHash,
      input.email,
      input.playerId,
      input.now,
      input.expiresAt,
    )
    .run()
}

export async function getEmailLink(
  db: D1Database,
  tokenHash: string,
): Promise<EmailLinkRow | null> {
  return db
    .prepare(
      `SELECT token_hash, email, player_id, created_at, expires_at, used_at
       FROM email_links WHERE token_hash = ?`,
    )
    .bind(tokenHash)
    .first<EmailLinkRow>()
}

export async function markEmailLinkUsed(
  db: D1Database,
  tokenHash: string,
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE email_links SET used_at = ?
       WHERE token_hash = ? AND used_at IS NULL`,
    )
    .bind(now, tokenHash)
    .run()
  return (result.meta.changes ?? 0) > 0
}

export async function attachEmail(
  db: D1Database,
  playerId: string,
  email: string,
): Promise<boolean> {
  try {
    const result = await db
      .prepare(
        `UPDATE players SET email = ?
         WHERE id = ? AND deleted_at IS NULL AND email IS NULL`,
      )
      .bind(email, playerId)
      .run()
    return (result.meta.changes ?? 0) > 0
  } catch (err) {
    if (isUnique(err)) return false
    throw err
  }
}

export async function abandonPlayer(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE players
       SET deleted_at = ?, display_name = '', email = NULL
       WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(now, playerId)
    .run()
  await revokeAllSessions(db, playerId, now)
}

export async function deletePlayerAccount(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<void> {
  await revokeAllSessions(db, playerId, now)
  await db
    .prepare('DELETE FROM imports WHERE player_id = ?')
    .bind(playerId)
    .run()
  await db
    .prepare(
      `UPDATE players
       SET deleted_at = ?, display_name = '', email = NULL
       WHERE id = ?`,
    )
    .bind(now, playerId)
    .run()
}

export async function insertImport(
  db: D1Database,
  playerId: string,
  contentHash: string,
  stats: CareerImport,
  now: number,
): Promise<'inserted' | 'duplicate'> {
  try {
    await db
      .prepare(
        `INSERT INTO imports (player_id, content_hash, payload, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(playerId, contentHash, canonicalCareer(stats), now)
      .run()
    return 'inserted'
  } catch (err) {
    if (isUnique(err)) return 'duplicate'
    throw err
  }
}

export async function listImports(
  db: D1Database,
  playerId: string,
): Promise<{ content_hash: string; payload: string; created_at: number }[]> {
  const result = await db
    .prepare(
      `SELECT content_hash, payload, created_at FROM imports
       WHERE player_id = ? ORDER BY created_at ASC`,
    )
    .bind(playerId)
    .all<{ content_hash: string; payload: string; created_at: number }>()
  return result.results
}

export async function rememberPlayerSeat(
  db: D1Database,
  playerId: string,
  roomCode: string,
  seat: number,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO player_rooms (player_id, room_code, seat, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(room_code, seat) DO UPDATE SET
         player_id = excluded.player_id,
         created_at = excluded.created_at`,
    )
    .bind(playerId, roomCode, seat, now)
    .run()
}

export async function listPlayerRooms(
  db: D1Database,
  playerId: string,
): Promise<{ room_code: string; seat: number }[]> {
  const result = await db
    .prepare(
      `SELECT room_code, seat FROM player_rooms WHERE player_id = ?`,
    )
    .bind(playerId)
    .all<{ room_code: string; seat: number }>()
  return result.results
}

export interface PlayerRankedRow {
  player_id: string
  rating: number
  ranked_games: number
  peak_rating: number
  updated_at: number
}

export async function getPlayerRanked(
  db: D1Database,
  playerId: string,
): Promise<PlayerRankedRow | null> {
  return (
    (await db
      .prepare(
        `SELECT player_id, rating, ranked_games, peak_rating, updated_at
         FROM player_ranked WHERE player_id = ?`,
      )
      .bind(playerId)
      .first<PlayerRankedRow>()) ?? null
  )
}

/** 以場數較新為準；同場數取較高 peak／較新 updated */
export async function upsertPlayerRanked(
  db: D1Database,
  playerId: string,
  state: {
    rating: number
    rankedGames: number
    peakRating: number
  },
): Promise<PlayerRankedRow> {
  const now = Date.now()
  const existing = await getPlayerRanked(db, playerId)
  let rating = Math.max(100, Math.min(3000, Math.round(state.rating)))
  let rankedGames = Math.max(0, Math.floor(state.rankedGames))
  let peakRating = Math.max(
    rating,
    Math.max(100, Math.min(3000, Math.round(state.peakRating))),
  )

  if (existing) {
    if (rankedGames < existing.ranked_games) {
      rating = existing.rating
      rankedGames = existing.ranked_games
      peakRating = existing.peak_rating
    } else if (rankedGames === existing.ranked_games) {
      peakRating = Math.max(peakRating, existing.peak_rating)
      // 保留分數較接近 peak 嘅一邊（防回退）
      if (Math.abs(existing.rating - peakRating) < Math.abs(rating - peakRating)) {
        rating = existing.rating
      }
    } else {
      peakRating = Math.max(peakRating, existing.peak_rating)
    }
  }

  await db
    .prepare(
      `INSERT INTO player_ranked (player_id, rating, ranked_games, peak_rating, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET
         rating = excluded.rating,
         ranked_games = excluded.ranked_games,
         peak_rating = excluded.peak_rating,
         updated_at = excluded.updated_at`,
    )
    .bind(playerId, rating, rankedGames, peakRating, now)
    .run()

  return {
    player_id: playerId,
    rating,
    ranked_games: rankedGames,
    peak_rating: peakRating,
    updated_at: now,
  }
}

/** —— Friends (F1) —— */

export type FriendshipStatus = 'pending' | 'accepted' | 'declined'

export interface FriendshipRow {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: number
  updated_at: number
}

export const MAX_PENDING_OUT = 10
export const MAX_FRIENDS = 200

export async function getPlayerByFriendCode(
  db: D1Database,
  code: string,
): Promise<PlayerRow | null> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null
  return db
    .prepare(
      `SELECT ${PLAYER_COLS} FROM players
       WHERE friend_code = ? AND deleted_at IS NULL`,
    )
    .bind(normalized)
    .first<PlayerRow>()
}

export async function getFriendship(
  db: D1Database,
  id: string,
): Promise<FriendshipRow | null> {
  return db
    .prepare(
      `SELECT id, requester_id, addressee_id, status, created_at, updated_at
       FROM friendships WHERE id = ?`,
    )
    .bind(id)
    .first<FriendshipRow>()
}

export async function findFriendshipBetween(
  db: D1Database,
  a: string,
  b: string,
): Promise<FriendshipRow | null> {
  return db
    .prepare(
      `SELECT id, requester_id, addressee_id, status, created_at, updated_at
       FROM friendships
       WHERE (requester_id = ? AND addressee_id = ?)
          OR (requester_id = ? AND addressee_id = ?)
       LIMIT 1`,
    )
    .bind(a, b, b, a)
    .first<FriendshipRow>()
}

export async function countPendingOutgoing(
  db: D1Database,
  playerId: string,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM friendships
       WHERE requester_id = ? AND status = 'pending'`,
    )
    .bind(playerId)
    .first<{ n: number }>()
  return row?.n ?? 0
}

export async function countAcceptedFriends(
  db: D1Database,
  playerId: string,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM friendships
       WHERE status = 'accepted'
         AND (requester_id = ? OR addressee_id = ?)`,
    )
    .bind(playerId, playerId)
    .first<{ n: number }>()
  return row?.n ?? 0
}

export async function createFriendRequest(
  db: D1Database,
  requesterId: string,
  addresseeId: string,
  now: number,
): Promise<FriendshipRow> {
  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO friendships
         (id, requester_id, addressee_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
    )
    .bind(id, requesterId, addresseeId, now, now)
    .run()
  return {
    id,
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: 'pending',
    created_at: now,
    updated_at: now,
  }
}

export async function setFriendshipStatus(
  db: D1Database,
  id: string,
  status: FriendshipStatus,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE friendships SET status = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(status, now, id)
    .run()
}

export async function deleteFriendship(
  db: D1Database,
  id: string,
): Promise<void> {
  await db.prepare(`DELETE FROM friendships WHERE id = ?`).bind(id).run()
}

export interface FriendshipListRow extends FriendshipRow {
  other_id: string
  other_name: string
  other_code: string
  other_last_seen: number | null
  other_in_game_at: number | null
}

export async function listFriendshipsFor(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<FriendshipListRow[]> {
  const ingameSince = now - PRESENCE_INGAME_MS
  const result = await db
    .prepare(
      `SELECT f.id, f.requester_id, f.addressee_id, f.status,
              f.created_at, f.updated_at,
              CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END AS other_id,
              p.display_name AS other_name,
              p.friend_code AS other_code,
              p.last_seen_at AS other_last_seen,
              (
                SELECT MAX(pr.created_at) FROM player_rooms pr
                WHERE pr.player_id = CASE
                  WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
                  AND pr.created_at >= ?
              ) AS other_in_game_at
       FROM friendships f
       JOIN players p ON p.id = CASE
         WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
       WHERE (f.requester_id = ? OR f.addressee_id = ?)
         AND f.status IN ('pending', 'accepted')
         AND p.deleted_at IS NULL
       ORDER BY f.updated_at DESC`,
    )
    .bind(playerId, playerId, ingameSince, playerId, playerId, playerId)
    .all<FriendshipListRow>()
  return result.results
}

export async function touchLastSeen(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<void> {
  await db
    .prepare(`UPDATE players SET last_seen_at = ? WHERE id = ?`)
    .bind(now, playerId)
    .run()
}

export type ChallengeStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled'

export interface ChallengeRow {
  id: string
  friendship_id: string
  challenger_id: string
  challengee_id: string
  room_code: string
  status: ChallengeStatus
  created_at: number
  expires_at: number
  updated_at: number
}

export interface ChallengeListRow extends ChallengeRow {
  other_id: string
  other_name: string
  other_code: string
}

export async function countPendingChallengesOut(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM friend_challenges
       WHERE challenger_id = ? AND status = 'pending' AND expires_at > ?`,
    )
    .bind(playerId, now)
    .first<{ n: number }>()
  return row?.n ?? 0
}

export async function createChallenge(
  db: D1Database,
  input: {
    friendshipId: string
    challengerId: string
    challengeeId: string
    roomCode: string
    now: number
  },
): Promise<ChallengeRow> {
  const id = crypto.randomUUID()
  const expires = input.now + CHALLENGE_TTL_MS
  await db
    .prepare(
      `INSERT INTO friend_challenges
         (id, friendship_id, challenger_id, challengee_id, room_code,
          status, created_at, expires_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    )
    .bind(
      id,
      input.friendshipId,
      input.challengerId,
      input.challengeeId,
      input.roomCode,
      input.now,
      expires,
      input.now,
    )
    .run()
  return {
    id,
    friendship_id: input.friendshipId,
    challenger_id: input.challengerId,
    challengee_id: input.challengeeId,
    room_code: input.roomCode,
    status: 'pending',
    created_at: input.now,
    expires_at: expires,
    updated_at: input.now,
  }
}

export async function getChallenge(
  db: D1Database,
  id: string,
): Promise<ChallengeRow | null> {
  return db
    .prepare(
      `SELECT id, friendship_id, challenger_id, challengee_id, room_code,
              status, created_at, expires_at, updated_at
       FROM friend_challenges WHERE id = ?`,
    )
    .bind(id)
    .first<ChallengeRow>()
}

export async function setChallengeStatus(
  db: D1Database,
  id: string,
  status: ChallengeStatus,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE friend_challenges SET status = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(status, now, id)
    .run()
}

export async function expireStaleChallenges(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE friend_challenges SET status = 'expired', updated_at = ?
       WHERE status = 'pending' AND expires_at <= ?
         AND (challenger_id = ? OR challengee_id = ?)`,
    )
    .bind(now, now, playerId, playerId)
    .run()
}

export async function listChallengesFor(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<ChallengeListRow[]> {
  await expireStaleChallenges(db, playerId, now)
  const result = await db
    .prepare(
      `SELECT c.id, c.friendship_id, c.challenger_id, c.challengee_id,
              c.room_code, c.status, c.created_at, c.expires_at, c.updated_at,
              CASE WHEN c.challenger_id = ? THEN c.challengee_id ELSE c.challenger_id END AS other_id,
              p.display_name AS other_name,
              p.friend_code AS other_code
       FROM friend_challenges c
       JOIN players p ON p.id = CASE
         WHEN c.challenger_id = ? THEN c.challengee_id ELSE c.challenger_id END
       WHERE (c.challenger_id = ? OR c.challengee_id = ?)
         AND c.status = 'pending'
         AND c.expires_at > ?
         AND p.deleted_at IS NULL
       ORDER BY c.created_at DESC`,
    )
    .bind(playerId, playerId, playerId, playerId, now)
    .all<ChallengeListRow>()
  return result.results
}

export async function listRoomPeers(
  db: D1Database,
  roomCode: string,
  selfId: string,
): Promise<{ seat: number; id: string; displayName: string; friendCode: string }[]> {
  const code = roomCode.trim().toUpperCase()
  const result = await db
    .prepare(
      `SELECT pr.seat AS seat, p.id AS id, p.display_name AS displayName,
              p.friend_code AS friendCode
       FROM player_rooms pr
       JOIN players p ON p.id = pr.player_id
       WHERE pr.room_code = ?
         AND pr.player_id != ?
         AND p.deleted_at IS NULL`,
    )
    .bind(code, selfId)
    .all<{ seat: number; id: string; displayName: string; friendCode: string }>()
  return result.results
}

export async function isPlayerInRoom(
  db: D1Database,
  playerId: string,
  roomCode: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS ok FROM player_rooms
       WHERE player_id = ? AND room_code = ? LIMIT 1`,
    )
    .bind(playerId, roomCode.trim().toUpperCase())
    .first<{ ok: number }>()
  return Boolean(row)
}

import { describe, expect, it } from 'vitest'
import {
  challengeRemainLabel,
  socialAlertCount,
  sortFriendsByPresence,
} from '../friendsUi'
import type { FriendEntry, FriendsSnapshot } from '../accountClient'

function entry(
  name: string,
  presence: FriendEntry['presence'],
): FriendEntry {
  return {
    id: name,
    status: 'accepted',
    direction: 'out',
    createdAt: 0,
    updatedAt: 0,
    presence,
    player: { id: name, displayName: name, friendCode: 'AAAAAA' },
  }
}

describe('friendsUi', () => {
  it('sorts ingame before online before offline', () => {
    const sorted = sortFriendsByPresence([
      entry('丙', 'offline'),
      entry('甲', 'ingame'),
      entry('乙', 'online'),
    ])
    expect(sorted.map((f) => f.player.displayName)).toEqual(['甲', '乙', '丙'])
  })

  it('counts incoming requests and challenges', () => {
    const snap: FriendsSnapshot = {
      friends: [],
      incoming: [entry('a', 'offline')],
      outgoing: [],
      challenges: [
        {
          id: '1',
          friendshipId: 'f',
          roomCode: 'ABC123',
          direction: 'in',
          expiresAt: 1,
          createdAt: 0,
          player: { id: 'x', displayName: 'x', friendCode: 'BBBBBB' },
        },
        {
          id: '2',
          friendshipId: 'f2',
          roomCode: 'DEF456',
          direction: 'out',
          expiresAt: 1,
          createdAt: 0,
          player: { id: 'y', displayName: 'y', friendCode: 'CCCCCC' },
        },
      ],
    }
    expect(socialAlertCount(snap)).toBe(2)
    expect(socialAlertCount(null)).toBe(0)
  })

  it('formats challenge remain', () => {
    expect(challengeRemainLabel(100_000, 100_000)).toBe('已過期')
    expect(challengeRemainLabel(100_000 + 90_000, 100_000)).toBe('1分30秒')
    expect(challengeRemainLabel(100_000 + 12_000, 100_000)).toBe('12秒')
  })
})

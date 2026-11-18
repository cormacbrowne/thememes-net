import { MP_POKER, pokerStart, pokerReduce, pokerTick, pokerSyncPlayers } from './mpPokerEngine';
import { MP_21, twentyOneStart, twentyOneReduce, twentyOneTick, twentyOneSyncPlayers } from './mpTwentyOneEngine';
import { MP_SERPENT, serpentStart, serpentReduce, serpentTick, serpentSyncPlayers } from './mpSerpentEngine';
import { T1000, thousandStart, thousandReduce, thousandTick, thousandSyncPlayers } from '../thousand/thousandEngine';

const THOUSAND_BOTS = [
  { name: 'Robo Rita', avatar: '🤖' },
  { name: 'Count Chip', avatar: '🦊' },
  { name: 'Deep Deck', avatar: '👾' }
];

/** Room start for 1000: seated friends, plus `opts.bots` computer players to fill empty seats. */
function thousandRoomStart(players, now, opts = {}) {
  const room = Math.max(0, T1000.maxPlayers - players.length);
  const bots = Math.max(0, Math.min(room, Number(opts.bots) || 0));
  const seats = [
    ...players,
    ...THOUSAND_BOTS.slice(0, bots).map((b, i) => ({ ...b, id: `cpu-${i + 1}`, bot: true, level: 'hard' }))
  ];
  return thousandStart(seats, now, { timers: true });
}

/**
 * Games that can be played with friends. `viewMode` matches the single-player cabinet, so the
 * invite link is that game's normal page plus `?room=CODE`.
 */
export const MP_GAMES = {
  poker: {
    id: 'poker',
    viewMode: 'poker',
    path: '/games/poker',
    title: "Hold'em with Friends",
    short: 'Poker',
    emoji: '🃏',
    minPlayers: MP_POKER.minPlayers,
    maxPlayers: MP_POKER.maxPlayers,
    tickMs: 400,
    publishOnAction: true,
    blurb: "Texas Hold'em for 2–4 players. Everyone starts with 1,000 table chips, blinds 10/20. Last player with chips wins.",
    invite: (name) => `🃏 ${name} saved you a seat at the poker table on THE MEMES.net — tap to sit down!`,
    start: pokerStart,
    reduce: pokerReduce,
    tick: pokerTick,
    sync: pokerSyncPlayers
  },
  blackjack: {
    id: 'blackjack',
    viewMode: 'blackjack',
    path: '/games/blackjack',
    title: "21's Head to Head",
    short: "21's",
    emoji: '♠️',
    minPlayers: MP_21.minPlayers,
    maxPlayers: MP_21.maxPlayers,
    tickMs: 300,
    publishOnAction: true,
    blurb: 'Two players, one dealer. Beat the dealer for chips and beat your friend for the round. 500 table chips each.',
    invite: (name) => `♠️ ${name} challenged you to 21's on THE MEMES.net — tap to take your seat!`,
    start: twentyOneStart,
    reduce: twentyOneReduce,
    tick: twentyOneTick,
    sync: twentyOneSyncPlayers
  },
  serpent: {
    id: 'serpent',
    viewMode: 'serpent',
    path: '/games/neon-serpent',
    title: 'Worm Wars',
    short: 'Worm Wars',
    emoji: '🐍',
    minPlayers: MP_SERPENT.minPlayers,
    maxPlayers: MP_SERPENT.maxPlayers,
    tickMs: MP_SERPENT.tickMs,
    publishOnAction: false,
    blurb: 'Up to 4 neon worms in one arena. Eat, grow, cut the others off. Last worm alive wins the round; first to 3 wins.',
    invite: (name) => `🐍 ${name} wants a Worm Wars rematch on THE MEMES.net — tap to join the arena!`,
    start: serpentStart,
    reduce: serpentReduce,
    tick: serpentTick,
    sync: serpentSyncPlayers
  },
  thousand: {
    id: 'thousand',
    viewMode: 'thousand',
    path: '/games/1000-card-game',
    title: '1000 with Friends',
    short: '1000',
    emoji: '🃏',
    // One human is enough when the host adds computer players; the start button checks humans + bots.
    minPlayers: T1000.minPlayers,
    maxPlayers: T1000.maxPlayers,
    maxBots: 3,
    hasRules: true,
    tickMs: 300,
    publishOnAction: true,
    blurb:
      'The classic Polish card game for 2–4. Bid, take the musik, declare marriages and race to 1000. Add computer players to fill empty seats — 3 players is the classic game.',
    invite: (name) => `🃏 ${name} dealt you in for a game of 1000 on THE MEMES.net — tap to take your seat!`,
    start: thousandRoomStart,
    reduce: thousandReduce,
    tick: thousandTick,
    sync: thousandSyncPlayers
  }
};

export function getMpGameForViewMode(viewMode) {
  return Object.values(MP_GAMES).find((g) => g.viewMode === viewMode) || null;
}

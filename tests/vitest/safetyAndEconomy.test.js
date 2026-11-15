import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, it, expect } from 'vitest';
import { checkText, checkTexts, isReservedName } from '../../supabase/functions/_shared/textFilter.js';
import { ENCODED_BLOCKLIST, rot13 } from '../../supabase/functions/_shared/textBlocklist.js';
import { isAllowedMediaUrl, sanitizeMediaUrl, OWN_MEDIA_STORAGE_PREFIX } from '../../src/utils/securityGuard.js';
import {
  RATE_LIMIT_TIERS,
  formatRateLimitMessage,
  extractClientIp,
  ipHashFor
} from '../../supabase/functions/_shared/rateLimitAndBot.js';
import {
  ARCADE_ECONOMY_RULES,
  createFreshDailyLedger,
  evaluateTokenAward,
  validateStakedGamePayout
} from '../../src/utils/tokenEconomy.js';
import {
  createShuffledDeck,
  evaluateFiveCardHand,
  evaluateBestHoldemHand,
  compareHandScores,
  decideAiPokerAction
} from '../../src/utils/pokerEngine.js';

const card = (rank, suit = '♠') => {
  const rankMap = { J: 11, Q: 12, K: 13, A: 14 };
  const val = rankMap[rank] ?? Number(rank);
  return { rank: String(rank), suit, val, isRed: suit === '♥' || suit === '♦', id: `${rank}${suit}` };
};

describe('Text moderation filter (Vitest)', () => {
  it('approves benign meme captions and Scunthorpe-safe words', () => {
    expect(checkText('cat.exe has stopped working').decision).toBe('approve');
    expect(checkText('Scunthorpe United supporters').decision).toBe('approve');
    expect(checkText('my therapist said I need grass').decision).toBe('approve');
    expect(checkTexts(['top text', 'bottom text', 'reaction']).decision).toBe('approve');
  });

  it('blocks links, personal info, reserved staff names, and decoded blocklist terms with evasions', () => {
    const linkRes = checkText('free coins at https://evil.example/claim');
    expect(linkRes.decision).toBe('reject');
    expect(linkRes.category).toBe('links');

    const piiRes = checkText('email me at leak@example.com');
    expect(piiRes.decision).toBe('reject');
    expect(piiRes.category).toBe('personal_info');

    expect(isReservedName('moderator')).toBe(true);
    expect(isReservedName('A D M I N')).toBe(true);
    expect(isReservedName('PixelMemer86')).toBe(false);

    const decodedWord = ENCODED_BLOCKLIST.map(([e, category]) => ({ word: rot13(e), category }))
      .find((entry) => entry.category === 'hate' && entry.word.length >= 4 && !entry.word.includes(' '));
    expect(decodedWord).toBeDefined();
    expect(checkText(decodedWord.word).decision).toBe('reject');
    expect(checkText(decodedWord.word.split('').join('.')).decision).toBe('reject');
  });
});

describe('Own-storage & seed URL allow-list (Vitest)', () => {
  it('permits /seed/, own Supabase memes bucket, blob:, and raster data:image/', () => {
    expect(isAllowedMediaUrl('/seed/meme1.jpg')).toBe(true);
    expect(isAllowedMediaUrl(`${OWN_MEDIA_STORAGE_PREFIX}u1/meme.webp`)).toBe(true);
    expect(isAllowedMediaUrl('https://www.thememes.net/seed/demo.webp')).toBe(true);
    expect(isAllowedMediaUrl('blob:https://www.thememes.net/1234-5678')).toBe(true);
    expect(isAllowedMediaUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(sanitizeMediaUrl('/seed/a.png', '/seed/fallback.png')).toBe('/seed/a.png');
  });

  it('rejects external URLs, traversal, SVG/HTML data URLs, and javascript: URIs', () => {
    expect(isAllowedMediaUrl('https://i.imgflip.com/1bij.jpg')).toBe(false);
    expect(isAllowedMediaUrl('https://images.unsplash.com/photo-1')).toBe(false);
    expect(isAllowedMediaUrl(`${OWN_MEDIA_STORAGE_PREFIX}../private/x.webp`)).toBe(false);
    expect(isAllowedMediaUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedMediaUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isAllowedMediaUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(sanitizeMediaUrl('https://evil.example/pic.jpg', '')).toBe('');
  });
});

describe('Rate-limit maths and client IP helpers (Vitest)', () => {
  it('enforces higher limits for established linked accounts and computes integer retry windows', () => {
    for (const action of ['upload', 'comment', 'vote', 'report']) {
      const std = RATE_LIMIT_TIERS.standard[action];
      const lnk = RATE_LIMIT_TIERS.linked[action];
      expect(std.length).toBeGreaterThan(0);
      expect(lnk[lnk.length - 1].max).toBeGreaterThan(std[std.length - 1].max);
    }

    expect(formatRateLimitMessage(0)).toContain('1 sec');
    expect(formatRateLimitMessage(61)).toContain('2 min');
    expect(formatRateLimitMessage(3601)).toContain('2 hr');
  });

  it('hashes proxy IPs cleanly without exposing raw addresses', async () => {
    const ip = extractClientIp({ 'cf-connecting-ip': '203.0.113.10', 'x-forwarded-for': '10.0.0.1' });
    expect(ip).toBe('203.0.113.10');
    const hashA = await ipHashFor(new Headers({ 'x-real-ip': '198.51.100.7' }));
    const hashB = await ipHashFor(new Headers({ 'x-real-ip': '198.51.100.8' }));
    expect(hashA).toMatch(/^[0-9a-f]{64}$/);
    expect(hashA).not.toBe(hashB);
  });
});

describe('validateStakedGamePayout and token caps (Vitest)', () => {
  it('always pays 0 in Free Practice mode (stake <= 0) and clamps extreme payouts', () => {
    expect(validateStakedGamePayout({ stakedTokens: 0, rawPayout: 5000 })).toBe(0);
    expect(validateStakedGamePayout({ stakedTokens: -10, rawPayout: 999 })).toBe(0);
    expect(validateStakedGamePayout({ stakedTokens: 10, rawPayout: -50 })).toBe(0);
    expect(validateStakedGamePayout({ stakedTokens: 25, rawPayout: 100, maxMultiplier: 12 })).toBe(100);
    expect(validateStakedGamePayout({ stakedTokens: 25, rawPayout: 999999, maxMultiplier: 12 })).toBe(300);
  });

  it('blocks duplicate action keys and respects daily category/global caps', () => {
    let ledger = createFreshDailyLedger();
    const first = evaluateTokenAward({
      ledger,
      category: 'engagement',
      requestedTokens: 1,
      actionKey: 'vote:meme-1'
    });
    expect(first.allowed).toBe(true);
    expect(first.awardedTokens).toBe(1);

    const dup = evaluateTokenAward({
      ledger: first.nextLedger,
      category: 'engagement',
      requestedTokens: 1,
      actionKey: 'vote:meme-1'
    });
    expect(dup.allowed).toBe(false);
    expect(dup.reason).toBe('already_rewarded');

    ledger = {
      ...createFreshDailyLedger(),
      totalToday: ARCADE_ECONOMY_RULES.MAX_DAILY_EARNED_TOKENS,
      byCategory: { upload: 35, engagement: 10, quests: 10, xpConversion: 10 }
    };
    const capped = evaluateTokenAward({ ledger, category: 'upload', requestedTokens: 12 });
    expect(capped.allowed).toBe(false);
    expect(capped.reason).toBe('daily_cap_reached');
    expect(capped.awardedTokens).toBe(0);
  });
});

describe('pokerEngine (Vitest)', () => {
  it('builds a complete 52-card unique deck and ranks hands accurately', () => {
    const deck = createShuffledDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);

    const royal = evaluateFiveCardHand([card('10'), card('J'), card('Q'), card('K'), card('A')]);
    const wheel = evaluateFiveCardHand([
      card('A', '♠'),
      card('2', '♥'),
      card('3', '♦'),
      card('4', '♣'),
      card('5', '♠')
    ]);
    const quads = evaluateFiveCardHand([
      card('K', '♠'),
      card('K', '♥'),
      card('K', '♦'),
      card('K', '♣'),
      card('2', '♠')
    ]);
    const boat = evaluateFiveCardHand([
      card('Q', '♠'),
      card('Q', '♥'),
      card('Q', '♦'),
      card('J', '♣'),
      card('J', '♠')
    ]);

    expect(royal.category).toBe(9);
    expect(quads.category).toBe(7);
    expect(boat.category).toBe(6);
    expect(wheel.category).toBe(4);
    expect(wheel.score[1]).toBe(5); // 5-high wheel straight
    expect(compareHandScores(royal.score, quads.score)).toBe(1);
    expect(compareHandScores(quads.score, boat.score)).toBe(1);
  });

  it('picks optimal 5-card hand out of 7 cards and returns bounded AI decisions', () => {
    const seven = [
      card('A', '♥'),
      card('K', '♥'),
      card('Q', '♥'),
      card('J', '♥'),
      card('10', '♥'),
      card('2', '♣'),
      card('7', '♦')
    ];
    const best = evaluateBestHoldemHand(seven);
    expect(best.category).toBe(9);
    expect(best.bestCards).toHaveLength(5);

    const decision = decideAiPokerAction({
      holeCards: [card('A', '♠'), card('A', '♥')],
      communityCards: [card('K', '♠'), card('7', '♦'), card('2', '♣')],
      toCall: 10,
      aiChips: 100,
      pot: 40,
      personality: 'aggressive'
    });
    expect(['fold', 'call', 'raise', 'check', 'bet']).toContain(decision.type);
    expect(decision.amount).toBeGreaterThanOrEqual(0);
    expect(decision.amount).toBeLessThanOrEqual(100);
  });
});

describe('tests/security.spec.js end-to-end against mock staging HTTP API (Vitest)', () => {
  it('runs all 6 staging security assertions with publishable key only', async () => {
    const execFileAsync = promisify(execFile);
    let userCounter = 0;
    let voteCalls = 0;
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const send = (status, body) => {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(body));
        };

        if (req.method === 'POST' && url.pathname === '/auth/v1/signup') {
          userCounter += 1;
          return send(200, {
            access_token: `tok-user-${userCounter}`,
            user: { id: `00000000-0000-4000-8000-00000000000${userCounter}` }
          });
        }
        if (req.method === 'GET' && url.pathname === '/rest/v1/memes') {
          return send(200, [
            {
              id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
              user_id: '99999999-9999-4999-8999-999999999999',
              title: 'Original'
            }
          ]);
        }
        if ((req.method === 'PATCH' || req.method === 'DELETE') && url.pathname === '/rest/v1/memes') {
          return send(200, []);
        }
        if (req.method === 'POST' && url.pathname === '/rest/v1/memes') {
          return send(403, { code: '42501', message: 'new row violates row-level security policy' });
        }
        if (req.method === 'POST' && url.pathname.startsWith('/storage/v1/object/')) {
          return send(403, { error: 'Unauthorized' });
        }
        if (req.method === 'GET' && url.pathname === '/rest/v1/notifications') {
          return send(200, []);
        }
        if (req.method === 'POST' && url.pathname === '/rest/v1/notifications') {
          return send(403, { code: '42501', message: 'forbidden' });
        }
        if (req.method === 'POST' && url.pathname === '/rest/v1/rpc/cast_vote') {
          voteCalls += 1;
          return send(200, { ok: true, score: 42, changed: voteCalls === 1 });
        }
        if (req.method === 'GET' && url.pathname === '/rest/v1/reports') {
          return send(200, []);
        }
        if (req.method === 'POST' && url.pathname === '/rest/v1/rpc/mod_queue') {
          return send(403, { code: '42501', message: 'moderators only' });
        }
        return send(404, { error: 'unhandled mock route' });
      });
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    try {
      const { stdout } = await execFileAsync(process.execPath, ['--test', 'tests/security.spec.js'], {
        env: {
          ...process.env,
          STAGING_SUPABASE_URL: `http://127.0.0.1:${port}`,
          STAGING_SUPABASE_ANON_KEY: 'sb_publishable_mock_only',
          SECURITY_SPEC_REQUIRED: '1'
        }
      });
      expect(stdout).toContain('# pass 6');
      expect(stdout).toContain('# fail 0');
    } finally {
      server.close();
    }
  });
});

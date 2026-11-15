import { test, expect } from '@playwright/test';
import { stampArcadeCartridgeFooter } from '../src/utils/canvasMutator.js';

const VIEWPORTS = [
  { name: 'iphone-390x844', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'ipad-768x1024', width: 768, height: 1024, isMobile: false, hasTouch: true },
  { name: 'desktop-1280x800', width: 1280, height: 800, isMobile: false, hasTouch: false }
];

const GAME_ROUTES = [
  {
    name: 'Arcade Lobby',
    path: '/games',
    verify: async (page) => {
      await expect(page.getByRole('heading', { name: /Cyber-Arcade Lobby/i })).toBeVisible();
      await expect(page.getByText(/Neon Lightning Roulette/i).first()).toBeVisible();
    }
  },
  {
    name: 'Lightning Roulette',
    path: '/games/roulette',
    verify: async (page) => {
      const redBtn = page.getByRole('button', { name: /RED/i }).first();
      await redBtn.scrollIntoViewIfNeeded();
      await expect(redBtn).toBeVisible();
      await redBtn.click();
      const spinBtn = page.locator('.tm-roul-spin-btn:visible').first();
      await spinBtn.scrollIntoViewIfNeeded();
      await expect(spinBtn).toBeVisible();
      await expect(spinBtn).toBeEnabled();
    }
  },
  {
    name: 'Cyber Pinball',
    path: '/games/pinball',
    verify: async (page) => {
      await expect(page.locator('section[aria-label*="Pinball"] canvas').first()).toBeVisible();
    }
  },
  {
    name: 'Neon Derby',
    path: '/games/horse-racing',
    verify: async (page) => {
      await expect(page.getByRole('tab', { name: /Win/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Exacta/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /START RACE/i })).toBeVisible();
      await expect(page.locator('canvas').first()).toBeVisible();
    }
  },
  {
    name: 'Guess the Meme',
    path: '/games/guess-the-meme',
    verify: async (page) => {
      await expect(page.locator('.tm-guess-enhance-btn, .tm-guess-next-btn').first()).toBeVisible();
      await expect(page.locator('canvas').first()).toBeVisible();
    }
  },
  {
    name: '80s Magic 8-Ball',
    path: '/games/magic-8-ball',
    verify: async (page) => {
      await expect(page.locator('.tm-8ball-stage').first()).toBeVisible();
      await expect(page.locator('.tm-8ball-sphere').first()).toBeVisible();
    }
  },
  {
    name: 'Higher or Lower',
    path: '/games/higher-or-lower',
    verify: async (page) => {
      await expect(page.locator('.tm-hilow-choice.is-higher')).toBeVisible();
      await expect(page.locator('.tm-hilow-choice.is-lower')).toBeVisible();
    }
  },
  {
    name: 'Neon Coin Dozer',
    path: '/games/coin-pusher',
    verify: async (page) => {
      await expect(page.locator('section[aria-label*="Coin Dozer"] canvas').first()).toBeVisible();
    }
  },
  {
    name: 'Neon 21s Blackjack',
    path: '/games/blackjack',
    verify: async (page) => {
      await expect(page.getByRole('button', { name: /DEAL/i }).first()).toBeVisible();
    }
  },
  {
    name: "Neon Hold'em Poker",
    path: '/games/poker',
    verify: async (page) => {
      await expect(page.locator('.tm-pk-cabinet')).toBeVisible();
      await expect(page.locator('.tm-pk-deal-btn')).toBeVisible();
    }
  },
  {
    name: 'One-Arm Bandit Slots',
    path: '/games/slots',
    verify: async (page) => {
      await expect(page.locator('.tm-bandit-spin-btn').first()).toBeVisible();
    }
  },
  {
    name: 'Meme Crush',
    path: '/games/meme-crush',
    verify: async (page) => {
      await expect(page.getByRole('tablist', { name: /Select Meme Crush Level/i })).toBeVisible();
    }
  },
  {
    name: 'MEMEDAQ Stocks',
    path: '/games/meme-stock-market',
    verify: async (page) => {
      await expect(page.getByRole('heading', { name: /MEMEDAQ/i })).toBeVisible();
    }
  }
];

for (const vp of VIEWPORTS) {
  test.describe(`Game routes smoke (${vp.name})`, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch
    });

    for (const route of GAME_ROUTES) {
      test(`${route.name} (${route.path}) renders cleanly with no horizontal overflow`, async ({
        page
      }) => {
        const pageErrors = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        await page.goto(route.path, { waitUntil: 'domcontentloaded' });
        await route.verify(page);

        const overflowPx = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        );
        expect(overflowPx).toBeLessThanOrEqual(2);
        expect(pageErrors).toEqual([]);
      });
    }
  });
}

test.describe('Phase 30 iPhone UX, Joystick, Roulette & Classic Meme Maker', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  test('Scrolled Feed -> Joystick Games button scrolls to top cleanly (no black screen)', async ({
    page
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tm-mobile-dock');

    // Scroll far down past initial memes
    await page.evaluate(() => window.scrollTo(0, 3200));
    await page.waitForTimeout(150);

    await page.locator('.tm-mobile-dock .tm-dock-btn', { hasText: /Games/i }).click();
    await page.waitForSelector('.tm-lobby');
    await page.waitForTimeout(200);

    const state = await page.evaluate(() => {
      const lobby = document.querySelector('.tm-lobby');
      const r = lobby ? lobby.getBoundingClientRect() : null;
      return { scrollY: window.scrollY, top: r?.top ?? -999, height: r?.height ?? 0 };
    });

    expect(state.scrollY).toBeLessThanOrEqual(5);
    expect(state.top).toBeGreaterThanOrEqual(0);
    expect(state.top).toBeLessThan(300);
    expect(state.height).toBeGreaterThan(300);
  });

  test('Roulette table is fully playable on iPhone without clipped board or covered controls', async ({
    page
  }) => {
    await page.goto('/games/roulette', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tm-roul-board-column');
    await page.waitForTimeout(300);

    const metrics = await page.evaluate(() => {
      const board = document.querySelector('.tm-roul-board-column');
      const spinBtn = document.querySelector('.tm-roul-mobile-actionbar .tm-roul-spin-btn');
      const wallet = document.querySelector('.tm-fixed-wallet-pill');
      const canvas = document.querySelector('.tm-roul-canvas');
      return {
        boardHeight: board ? board.getBoundingClientRect().height : 0,
        spinRect: spinBtn ? spinBtn.getBoundingClientRect().toJSON() : null,
        walletRect: wallet ? wallet.getBoundingClientRect().toJSON() : null,
        wheelWidth: canvas ? canvas.getBoundingClientRect().width : 0
      };
    });

    // Betting board must no longer be crushed into a 112px overflow slot
    expect(metrics.boardHeight).toBeGreaterThanOrEqual(350);
    expect(metrics.spinRect?.height).toBeGreaterThanOrEqual(40);
    expect(metrics.walletRect?.width).toBeGreaterThan(20);
    expect(metrics.wheelWidth).toBeGreaterThanOrEqual(240);

    // Place a Red bet and Spin
    const redBtn = page.locator('.tm-roul-outside-cell.red-zone').first();
    await redBtn.scrollIntoViewIfNeeded();
    await redBtn.click();
    await expect(redBtn.locator('.tm-roul-chip-stack')).toBeVisible();

    const spinAction = page.locator('.tm-roul-mobile-actionbar .tm-roul-spin-btn');
    await expect(spinAction).toBeVisible();
    await expect(spinAction).toBeEnabled();
    await expect(spinAction).toContainText(/SPIN/i);
    await spinAction.click();
    await expect(spinAction).toContainText(/SPINNING/i);
    await expect(page.locator('.tm-roul-wheel-column.is-spinning')).toBeVisible();
    await expect(page.locator('.tm-roul-telemetry-pill')).toBeVisible();

    const spinningWidth = await page.evaluate(() => {
      const c = document.querySelector('.tm-roul-canvas');
      return c ? c.getBoundingClientRect().width : 0;
    });
    expect(spinningWidth).toBeGreaterThanOrEqual(300);
  });

  test('DeLorean Time Machine banner, Time Circuits modal & 88 MPH warp work cleanly on iPhone', async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/games', { waitUntil: 'domcontentloaded' });
    const banner = page.locator('.tm-delorean-banner');
    await expect(banner).toBeVisible();

    await banner.locator('button', { hasText: /Time Circuits/i }).click();
    const modal = page.locator('.tm-delorean-modal');
    await expect(modal).toBeVisible();

    await modal.locator('.tm-delorean-era-btn', { hasText: /2015/i }).click();
    await expect(page.locator('.tm-app.tm-era-2015')).toBeVisible();
    await expect(page.locator('.tm-delorean-flyby-layer')).toBeVisible();

    const overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);
    expect(pageErrors).toEqual([]);
  });

  test('Simple Meme & GIF Maker has no template clutter and supports upload + Top/Bottom text + PNG export', async ({
    page
  }) => {
    await page.goto('/meme-generator', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tm-forge');

    // Verify templates UI is removed
    expect(await page.locator('.tm-forge-template-card').count()).toBe(0);
    await expect(page.locator('.tm-forge-upload-hub')).toBeVisible();

    const fileInput = page.locator('.tm-forge input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'sample.png',
      mimeType: 'image/png',
      buffer: buildTinyPngBuffer()
    });

    const topInput = page.locator('#tm-forge-top-text');
    const bottomInput = page.locator('#tm-forge-bottom-text');
    await expect(topInput).toBeVisible();
    await expect(bottomInput).toBeVisible();

    await topInput.fill('TOP MEME TEST');
    await bottomInput.fill('BOTTOM TEXT WORKS');
    await expect(topInput).toHaveValue('TOP MEME TEST');
    await expect(bottomInput).toHaveValue('BOTTOM TEXT WORKS');

    // Size slider updates percentage label smoothly
    const sizeRange = page.locator('.tm-forge-tools input[type="range"]').first();
    await sizeRange.fill('0.12');
    await expect(page.locator('.tm-forge-tools')).toContainText('133%');

    const dlBtn = page.locator('.tm-forge button', { hasText: /Download/i }).first();
    await expect(dlBtn).toBeEnabled();
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await dlBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/i);
  });
});

// Tiny valid PNG buffer for image upload & watermarked PNG export tests
function buildTinyPngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAADklEQVQI12P4z8DAwMAAAwAB/wL+qSAAAAAASUVORK5CYII=',
    'base64'
  );
}

// Valid 4x4 2-frame animated GIF89a binary helper for client-side GIF burn-in test
function buildTinyAnimatedGifBuffer() {
  const bytes = [
    // Header: GIF89a
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
    // Logical screen descriptor: 4x4, GCT=1 (2 colors), bg=0, aspect=0
    0x04, 0x00, 0x04, 0x00, 0x80, 0x00, 0x00,
    // Global color table (black, white)
    0x00, 0x00, 0x00, 0xff, 0xff, 0xff,
    // Netscape 2.0 loop block
    0x21, 0xff, 0x0b, 0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
    0x03, 0x01, 0x00, 0x00, 0x00,
    // Graphic Control Extension (frame 1, 100ms)
    0x21, 0xf9, 0x04, 0x04, 0x0a, 0x00, 0x00, 0x00,
    // Image descriptor 4x4
    0x2c, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x04, 0x00, 0x00,
    // LZW min code size 2 + image data (all color 0)
    0x02, 0x04, 0x84, 0x8f, 0x09, 0x05, 0x00,
    // Graphic Control Extension (frame 2, 100ms)
    0x21, 0xf9, 0x04, 0x04, 0x0a, 0x00, 0x00, 0x00,
    // Image descriptor 4x4
    0x2c, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x04, 0x00, 0x00,
    // LZW min code size 2 + image data (color 1)
    0x02, 0x05, 0x8c, 0x2d, 0x99, 0x87, 0x02, 0x00,
    // Trailer
    0x3b
  ];
  return Buffer.from(bytes);
}

test.describe('Phase 30B Simple Quick Upload, GIF Burn-In, Viral Share & JSON-LD', () => {
  test('QuickUploadBar lets users upload an image, add Top/Bottom text, and Download without templates', async ({
    page
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tm-quick-upload-shell');

    // No template button on QuickUploadBar and no Trending Formats clutter above feed
    await expect(page.locator('button', { hasText: /Pick Template/i })).toHaveCount(0);
    await expect(page.locator('.tm-trending-formats-wrap')).toHaveCount(0);

    const fileInput = page.locator('.tm-quick-upload-shell input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'quick.png',
      mimeType: 'image/png',
      buffer: buildTinyPngBuffer()
    });

    const topField = page.locator('.tm-quick-upload-composer input[aria-label="Top meme text"]');
    const botField = page.locator('.tm-quick-upload-composer input[aria-label="Bottom meme text"]');
    await expect(topField).toBeVisible();
    await topField.fill('WHEN UPLOAD IS INSTANT');
    await botField.fill('AND WATERMARKED ON SHARE');

    const dlBtn = page.locator('.tm-quick-upload-composer button', { hasText: /Download/i });
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await dlBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/i);
  });

  test('/templates/drake-meme-generator routes cleanly to /meme-generator with SoftwareApplication JSON-LD', async ({
    page
  }) => {
    await page.goto('/templates/drake-meme-generator', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tm-forge');

    expect(await page.locator('.tm-forge-template-card').count()).toBe(0);
    await expect(page.locator('.tm-forge-upload-hub')).toBeVisible();

    const ldJsonRaw = await page.locator('#tm-dynamic-jsonld').textContent();
    const ldJson = JSON.parse(ldJsonRaw || '{}');
    expect(ldJson['@type']).toBe('SoftwareApplication');
    expect(ldJson.url).toContain('/meme-generator');
  });

  test('/gif-meme-maker burns Top & Bottom text into downloaded animated GIF', async ({ page }) => {
    await page.goto('/gif-meme-maker', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tm-forge');

    const fileInput = page.locator('.tm-forge input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'sample.gif',
      mimeType: 'image/gif',
      buffer: buildTinyAnimatedGifBuffer()
    });

    const dlBtn = page.locator('button', { hasText: /Download GIF/i });
    await expect(dlBtn).toBeVisible({ timeout: 8000 });
    await expect(dlBtn).toBeEnabled();

    await page.locator('#tm-forge-top-text').fill('GIF TOP');
    await page.locator('#tm-forge-bottom-text').fill('GIF BOTTOM');

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await dlBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.gif$/i);

    const fsMod = await import('node:fs');
    const dlPath = await download.path();
    const savedBytes = fsMod.readFileSync(dlPath);
    expect(savedBytes.subarray(0, 6).toString('ascii')).toBe('GIF89a');
  });

  test('Remixes challenge filter & dynamic /m/:id?ref=share link format', async ({ page }) => {
    await page.addInitScript(() => {
      window.__copiedText = '';
      try {
        Object.defineProperty(navigator, 'clipboard', {
          value: {
            writeText: async (txt) => {
              window.__copiedText = txt;
            }
          },
          configurable: true
        });
      } catch {
        if (navigator.clipboard) {
          navigator.clipboard.writeText = async (txt) => {
            window.__copiedText = txt;
          };
        }
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tm-card.tm-holo-card');

    const remixTab = page.locator('.tm-tab', { hasText: /Remixes/i });
    await expect(remixTab).toBeVisible();
    await remixTab.click();
    await page.waitForTimeout(150);

    const cardCount = await page.locator('.tm-card.tm-holo-card').count();
    expect(cardCount).toBeGreaterThan(0);

    // Click Share on the first meme card and inspect copied URL format
    await page.locator('.tm-card.tm-holo-card button[aria-label*="Share" i]').first().click();
    const copied = await page.evaluate(() => window.__copiedText);
    expect(copied).toMatch(/\/m\/.+\?ref=share$/);
  });
});

test.describe('Las Vegas Slot Arcade & Mobile Audio Recovery', () => {
  test('Slot Arcade switches across all 4 machines cleanly on desktop & iPhone with zero overflow', async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/games/slots', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tm-slot-switcher-bar');

    // Open Slot Floor directory and verify all 5 cabinets appear
    await page.getByRole('button', { name: /Slot Floor/i }).click();
    const floorGrid = page.locator('.tm-slot-floor-grid');
    await expect(floorGrid).toBeVisible();
    await expect(floorGrid).toContainText(/One-Arm Bandit '85/i);
    await expect(floorGrid).toContainText(/Neon Supernova Special '86/i);
    await expect(floorGrid).toContainText(/Mr\. Jackpots: Silver Mustang/i);
    await expect(floorGrid).toContainText(/Neon Lightning Vault 5000/i);
    await expect(floorGrid).toContainText(/Cyber Buffalo Stampede '86/i);

    // Step up to Silver Mustang (Dougie Jones tribute)
    const mustangCard = floorGrid.locator('.tm-slot-floor-card', { hasText: /Mr\. Jackpots/i });
    await mustangCard.getByRole('button', { name: /Step Up/i }).click();
    await expect(page.locator('.tm-bandit-marquee-title')).toContainText(/MR\. JACKPOTS: SILVER MUSTANG/i);
    await expect(page.locator('.tm-slot-dougie-quote')).toBeVisible();
    await expect(page.locator('.tm-video-cell')).toHaveCount(15);

    // Verify 390px iPhone layout fits without horizontal overflow
    let overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);

    // Toggle Lines, Turbo, select DEMO bet, spin cleanly, verify wallet stays unchanged on DEMO
    await page.getByRole('button', { name: /25 LINES/i }).click();
    await expect(page.getByRole('button', { name: /5 LINES/i })).toBeVisible();
    await page.getByRole('button', { name: /TURBO/i }).click();
    await page.getByRole('button', { name: /DEMO/i }).click();
    const walletBeforeDemo = await page.locator('.tm-bandit-stat-box strong').first().textContent();
    await page.locator('.tm-bandit-spin-btn').click();
    await expect(page.locator('.tm-bandit-spin-btn')).toBeEnabled({ timeout: 5000 });
    const walletAfterDemo = await page.locator('.tm-bandit-stat-box strong').first().textContent();
    expect(walletAfterDemo).toBe(walletBeforeDemo);

    // Switch to Lightning Vault 5000 via top tab bar and test Ante +25% + VIP High-Roller Neons
    await page.getByRole('tab', { name: /Lightning 5000/i }).click();
    await expect(page.locator('.tm-bandit-marquee-title')).toContainText(/NEON LIGHTNING VAULT 5000/i);
    await expect(page.locator('[data-testid="slot-neon-crown"]')).toBeVisible();
    await expect(page.locator('[data-testid="slot-neon-rail-left"]')).toBeVisible();
    await expect(page.locator('[data-testid="slot-neon-rail-right"]')).toBeVisible();
    await expect(page.locator('.tm-bandit-chip-btn.vip')).toContainText(/100🪙/);
    await expect(page.locator('.tm-slot-jackpot-leds')).toContainText(/GRAND/i);
    await page.getByRole('button', { name: /ANTE \+25%/i }).click();
    await expect(page.getByRole('button', { name: /ANTE \+25% ON/i })).toBeVisible();

    overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);

    // Switch to Cyber Buffalo '86 (5x4 grid = 20 cells, 1,024 Ways) and test Staked Spin + Neon Crown
    await page.getByRole('tab', { name: /Buffalo '86/i }).click();
    await expect(page.locator('.tm-bandit-marquee-title')).toContainText(/CYBER BUFFALO STAMPEDE '86/i);
    await expect(page.locator('[data-testid="slot-neon-crown"]')).toBeVisible();
    await expect(page.locator('.tm-video-cell')).toHaveCount(20);
    await page.getByRole('button', { name: /5🪙|🪙 5\b/ }).first().click();
    await page.locator('.tm-bandit-spin-btn').click();
    await expect(page.locator('.tm-bandit-spin-btn')).toBeEnabled({ timeout: 5000 });

    // Switch to Neon Special '86 (5th flagship cabinet) and verify 6 powerups + chase lights + neons + house edge
    await page.getByRole('tab', { name: /Neon Special/i }).click();
    await expect(page.locator('.tm-bandit-marquee-title')).toContainText(/NEON SUPERNOVA SPECIAL '86/i);
    await expect(page.locator('[data-testid="slot-neon-crown"]')).toBeVisible();
    await expect(page.locator('.tm-neon-pw-btn')).toHaveCount(6);
    await expect(page.locator('.tm-slot-house-edge-strip')).toContainText(/11\.5% HOUSE EDGE/i);

    overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);

    // Switch back to classic One-Arm Bandit '85 and check desktop layout + Rules drawer
    await page.getByRole('tab', { name: /Bandit '85/i }).click();
    await expect(page.locator('.tm-bandit-drum-window')).toHaveCount(3);
    await expect(page.locator('.tm-bandit-arm-ball')).toBeVisible();
    await expect(page.locator('[data-testid="slot-neon-crown"]')).toHaveCount(0);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('button', { name: /ℹ Rules/i }).click();
    await expect(page.locator('.tm-slot-paytable-drawer')).toBeVisible();
    overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);

    expect(pageErrors).toEqual([]);
  });

  test('Slot Machine survives 12 consecutive pulls including out-of-tokens Demo auto-switch', async ({
    page
  }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/games/slots', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tm-slot-switcher-bar');

    // Select Neon Lightning Vault 5000 (most expensive VIP neon cabinet), enable Turbo, set $2.50 (10🪙) wager
    await page.getByRole('tab', { name: /Lightning 5000/i }).click();
    await expect(page.locator('[data-testid="slot-neon-crown"]')).toBeVisible();
    await page.getByRole('button', { name: /TURBO/i }).click();
    await page.getByRole('button', { name: /10🪙/i }).first().click();

    // Perform 12 consecutive pulls (will drain initial 20-25 tokens and auto-step down to Demo without locking)
    for (let i = 0; i < 12; i += 1) {
      const wheelBtn = page.locator('.tm-wheel-spin-cta');
      if (await wheelBtn.isVisible().catch(() => false)) {
        await wheelBtn.click();
        await expect(wheelBtn).toBeHidden({ timeout: 6000 });
      } else {
        const spinBtn = page.locator('.tm-bandit-spin-btn');
        await expect(spinBtn).toBeEnabled({ timeout: 6000 });
        await spinBtn.click();
      }
      await page.waitForTimeout(80);
      await expect(page.locator('.tm-bandit-spin-btn')).toBeEnabled({ timeout: 6000 });
    }

    const overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Radio button toggles and survives visibility interruption without errors', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const radioBtn = page.locator('button.tm-radio-toggle').first();
    await expect(radioBtn).toBeVisible();
    await radioBtn.click();
    await expect(radioBtn).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('pageshow'));
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    await page.waitForTimeout(150);
    await expect(radioBtn).toHaveAttribute('aria-pressed', 'true');

    expect(pageErrors).toEqual([]);
  });

  test('Graphic Equalizer & Fullscreen Music Equalizer Mode work across viewports without overflow', async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Open station/EQ picker popover via the top chevron button
    await page.locator('.tm-radio-chevron-btn').first().click();
    await expect(page.locator('.tm-radio-popover')).toBeVisible();

    // Launch Full-Screen Music Equalizer Mode
    await page.getByRole('button', { name: /Open Fullscreen Music Equalizer/i }).first().click();
    const overlay = page.locator('.tm-eq-fs-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('canvas.tm-eq-fs-canvas')).toBeVisible();
    await expect(overlay.locator('.tm-eq-panel')).toBeVisible();

    // Switch visualizer modes & apply Bass Boost preset + adjust a band slider
    await overlay.getByRole('button', { name: /Mirror/i }).click();
    await overlay.getByRole('button', { name: /Cyber Ring/i }).click();
    await overlay.getByRole('button', { name: /CRT Scope/i }).click();
    await overlay.locator('.tm-eq-preset-btn', { hasText: 'Bass+' }).click();
    const firstBand = overlay.locator('.tm-eq-vertical-range').first();
    await firstBand.fill('6');

    let overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);

    // Verify desktop layout of Full-Screen Equalizer
    await page.setViewportSize({ width: 1280, height: 800 });
    await overlay.getByRole('button', { name: /Spectrum/i }).click();
    overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);

    // Exit Full-Screen Equalizer cleanly
    await overlay.getByRole('button', { name: /Exit Full-Screen Music Equalizer/i }).click();
    await expect(overlay).toBeHidden();
    expect(pageErrors).toEqual([]);
  });

  test('Mobile Extras Drawer Fullscreen EQ auto-closes drawer + 80s Characters & Airwolf/Blue Thunder flybys work', async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 1. Open Extras drawer and click Fullscreen Equalizer inside it — drawer must close so EQ is on top
    const extrasBtn = page.getByRole('button', { name: /Extras|More/i }).first();
    if (await extrasBtn.isVisible()) {
      await extrasBtn.click();
      const drawer = page.locator('.tm-extras-drawer-backdrop');
      if (await drawer.isVisible()) {
        await drawer.getByRole('button', { name: /Equalizer|Fullscreen/i }).first().click();
        await expect(page.locator('.tm-eq-fs-overlay')).toBeVisible();
        await expect(drawer).toBeHidden();
        await page.locator('.tm-eq-fs-overlay').getByRole('button', { name: /Exit Full-Screen/i }).click();
      }
    }

    // 2. Verify 1980s Characters digital faces strip, dossier 1985 price, and Airwolf/Blue Thunder flybys
    const castBar = page.locator('.tm-80s-cast-bar').first();
    await castBar.scrollIntoViewIfNeeded();
    await expect(castBar).toBeVisible();
    await expect(castBar.locator('.tm-80s-face-chip')).toHaveCount(13);
    await castBar.locator('.tm-80s-face-chip', { hasText: /Bender/i }).click();
    await expect(castBar.locator('.tm-80s-dossier-card')).toContainText(/The Breakfast Club/i);
    await expect(castBar.locator('.tm-80s-dossier-card')).toContainText(/\$1\.25/);

    await castBar.locator('.tm-80s-chopper-btn.is-airwolf').click();
    await expect(page.locator('.tm-win-chopper-unit.is-airwolf')).toBeVisible();

    await castBar.locator('.tm-80s-chopper-btn.is-bluethunder').click();
    await expect(page.locator('.tm-win-chopper-unit.is-bluethunder')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('MEMEDAQ Stock Market displays macro regime, Sentiment gauge, and trading without overflow', async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/games/meme-stock-market', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.tm-stocks-regime-pill')).toBeVisible();
    await expect(page.getByText(/Sentiment \d+\/100/i)).toBeVisible();

    const buyBtn = page.locator('.tm-stock-trade-btn.buy').first();
    await expect(buyBtn).toBeVisible();
    await buyBtn.click();

    const overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);
    expect(pageErrors).toEqual([]);
  });

  test('AI Assistant exposes clear iPhone Speech Engine modes and Test Voice without errors', async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/games', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /🤖 AI/i }).click();
    const panel = page.locator('.tm-ai-copilot-panel');
    await expect(panel).toBeVisible();

    const engineSelect = panel.locator('select[aria-label="Speech engine mode"]');
    await expect(engineSelect).toBeVisible();
    await engineSelect.selectOption('synth');
    await panel.getByRole('button', { name: /🔊 Test/i }).click();

    const overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);
    expect(pageErrors).toEqual([]);
  });

  test("Neon Hold'em Poker deals, bets with chips, and fits iPhone/iPad/Desktop without overflow", async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    for (const vp of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 }
    ]) {
      await page.setViewportSize(vp);
      await page.goto('/games/poker', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.tm-pk-cabinet')).toBeVisible();
      const dealBtn = page.locator('.tm-pk-deal-btn');
      if (await dealBtn.isVisible() && (await dealBtn.isEnabled())) {
        await dealBtn.click();
        await expect(page.locator('.tm-pk-hand-rank-pill')).toBeVisible();
        if (vp.width === 1280) {
          const callOrCheckBtn = page.locator('.tm-pk-act-btn.check');
          await expect(callOrCheckBtn).toBeVisible({ timeout: 5000 });
          await callOrCheckBtn.click();
          // AI turns complete and deal the flop (or showdown if all bots fold) without freezing on Dealing cards...
          await expect(
            page.locator('.tm-pk-board .tm-pk-card, .tm-pk-showdown-banner').first()
          ).toBeVisible({ timeout: 8000 });
        }
      }
      const overflowPx = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflowPx).toBeLessThanOrEqual(2);
    }

    expect(pageErrors).toEqual([]);
  });

  test('Mobile modal close buttons are clear >= 44px tap targets and Pinball stays unobstructed on iPhone', async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Open Rewards Vault modal & verify prominent Close button >= 44px
    await page.getByRole('button', { name: /Open Token Wallet|Rewards|🪙/i }).first().click();
    const closeBtn = page.locator('.tm-modal-sticky-header button', { hasText: /Close/i }).first();
    await expect(closeBtn).toBeVisible();
    const box = await closeBtn.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(42);
    await closeBtn.click();

    // Navigate to Pinball on iPhone and verify canvas bounding box is prominently visible
    await page.goto('/games/pinball', { waitUntil: 'domcontentloaded' });
    const canvas = page.locator('.tm-pin2-canvas');
    await expect(canvas).toBeVisible();
    const cBox = await canvas.boundingBox();
    expect(cBox.height).toBeGreaterThan(360);

    // Navigate to Horse Racing on iPhone and start a race with live track cam
    await page.goto('/games/horse-racing', { waitUntil: 'domcontentloaded' });
    const derbyCanvas = page.locator('.tm-derby-canvas');
    await expect(derbyCanvas).toBeVisible();
    const derbyBox = await derbyCanvas.boundingBox();
    expect(derbyBox.height).toBeGreaterThanOrEqual(280);
    await page.locator('.tm-derby-primary-btn').first().click();
    await expect(page.locator('.tm-derby-canvas.is-live-race')).toBeVisible();

    // Launch Slots from scrolled feed on iPhone & switch across all 4 jackpot machines cleanly
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.goto('/games/slots', { waitUntil: 'domcontentloaded' });
    for (const label of [/Neon Special/i, /Mr\.? Jackpots/i, /Lightning/i, /Buffalo/i, /Bandit/i]) {
      const tab = page.locator('.tm-slot-tab-btn', { hasText: label }).first();
      await expect(tab).toBeVisible();
      await tab.click();
      await expect(page.locator('.tm-bandit-cabinet')).toBeVisible();
      const spinBox = await page.locator('.tm-bandit-spin-btn').first().boundingBox();
      expect(spinBox).not.toBeNull();
      expect(spinBox.height).toBeGreaterThan(20);
    }

    expect(pageErrors).toEqual([]);
  });

  test('Dual-Direction Hero, 80s Cars, Magic 8-Ball, iPhone App Modal & Upgraded Pinball work cleanly on iPhone', async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const hero = page.locator('.tm-dual-hero');
    await expect(hero).toBeVisible();
    await expect(hero.locator('h1')).toContainText(/TWO 80s WORLDS/i);
    await expect(hero.locator('.tm-portal-card.is-memes')).toBeVisible();
    await expect(hero.locator('.tm-portal-card.is-arcade')).toBeVisible();

    const overflowHome = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowHome).toBeLessThanOrEqual(2);

    // Open & close iPhone App Home Screen installation modal
    await hero.locator('.tm-dual-iphone-btn').click();
    const iphoneModal = page.locator('.tm-iphone-modal');
    await expect(iphoneModal).toBeVisible();
    await expect(iphoneModal).toContainText(/Add to Home Screen/i);
    await iphoneModal.locator('.tm-modal-sticky-header button').click();
    await expect(iphoneModal).toBeHidden();

    // Switch 80s Iconic Cars in the Garage banner
    const banner = page.locator('.tm-delorean-banner');
    await banner.scrollIntoViewIfNeeded();
    for (const carShort of [/Lagonda/i, /Cosworth/i, /911 SC/i]) {
      const chip = banner.locator('.tm-80s-car-chip', { hasText: carShort });
      await expect(chip).toBeVisible();
      await chip.click();
      await expect(page.locator('.tm-delorean-flyby-layer')).toBeVisible();
    }

    // Visit /games/magic-8-ball and shake the 80s Magic 8-Ball Oracle
    await page.goto('/games/magic-8-ball', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.tm-8ball-sphere')).toBeVisible();
    await page.locator('.tm-8ball-shake-cta').click();
    await page.waitForTimeout(1150);
    await expect(page.locator('.tm-8ball-tri-text')).toBeVisible();

    // Verify upgraded Pinball 3-Way Nudge & Magna-Save buttons on iPhone
    await page.goto('/games/pinball', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.tm-pin2-canvas')).toBeVisible();
    await expect(page.locator('[aria-label="Mobile 3-Way Nudge"] button')).toHaveCount(3);
    await expect(page.locator('button[aria-label="Activate Magna-Save"]')).toBeVisible();

    const overflowPinball = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPinball).toBeLessThanOrEqual(2);

    expect(pageErrors).toEqual([]);
  });

  test("Neon Bingo '86 works end-to-end (blower, calls, manual dab, false-call tomato boo, Ceefax 888, zero overflow)", async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/games/neon-bingo', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/80s Neon Bingo/i);
    await expect(page.locator('.tm-bingo-arena')).toBeVisible();
    await expect(page.locator('.tm-bingo-cage-canvas')).toBeVisible();
    await expect(page.locator('.tm-shout-bingo-btn')).toBeVisible();

    // Switch to manual caller speed so timer draws don't race assertions
    await page.locator('.tm-bingo-speed-select').selectOption('manual');
    await page.locator('.tm-bingo-primary-btn').click();
    await expect(page.locator('.tm-bingo-ball-counter')).toContainText('1/90 DRAWN');
    await expect(page.locator('.tm-bingo-current-orb .tm-orb-num')).toBeVisible();

    // Draw until a called number appears on the player's card and manually stamp it with the Neon Dabber
    for (let i = 0; i < 15; i++) {
      const callableCount = await page.locator('.tm-ticket-cell.is-callable').count();
      if (callableCount > 0) break;
      await page.locator('.tm-bingo-primary-btn').click();
    }
    const firstCallable = page.locator('.tm-ticket-cell.is-callable').first();
    await expect(firstCallable).toBeVisible();
    await firstCallable.click();
    await expect(page.locator('.tm-ticket-cell.is-number.is-dabbed')).toHaveCount(1);

    // Clicking SHOUT BINGO with no valid win triggers crowd BOOOOOO + flying tomato splats
    await page.locator('.tm-shout-bingo-btn').click();
    await expect(page.locator('.tm-bingo-crowd-banner.is-boo')).toBeVisible();
    await expect(page.locator('.tm-bingo-crowd-banner.is-boo')).toContainText(/BOOOOOO!! FALSE BINGO CALL/i);
    await expect(page.locator('.tm-bingo-tomato-layer')).toBeVisible();

    // Toggle BBC Ceefax P.888 mode & open All 90 Comedy Calls drawer
    await page.getByRole('button', { name: /Ceefax 888/i }).click();
    await expect(page.locator('.tm-bingo-blower-head')).toContainText(/CEEFAX 888/i);
    await page.getByRole('button', { name: /All 90 Calls/i }).click();
    await expect(page.locator('.tm-bingo-dict-drawer')).toContainText(/Two Little Ducks/i);
    await page.locator('.tm-bingo-dict-drawer').getByRole('button', { name: /Close/i }).click();

    // Switch to 75-Ball Vegas 5x5 card format
    await page.getByRole('button', { name: /75-Ball Vegas/i }).click();
    await expect(page.locator('.tm-bingo-75-head')).toBeVisible();

    // Verify zero horizontal overflow across mobile, tablet, and desktop
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(150);
      const overflowPx = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(
        overflowPx,
        `Horizontal overflow ${overflowPx}px on /games/neon-bingo at ${vp.name}`
      ).toBeLessThanOrEqual(2);
    }

    expect(pageErrors).toEqual([]);
  });

  test('Shareable Boss/Prank screens & new Game routes load cleanly with SEO metadata and interactive features', async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1280, height: 800 });

    // Fake Microsoft Teams & Zoom Call Boss Screen
    await page.goto('/fake-teams-zoom-call-screen', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Fake Microsoft Teams & Zoom Call Screen/i);
    await expect(page.locator('.tm-boss-overlay')).toBeVisible();
    await expect(page.getByRole('button', { name: /Share Screen/i })).toBeVisible();
    await expect(page.getByText('Microsoft Teams').first()).toBeVisible();
    await page.getByRole('button', { name: /Switch to Zoom UI/i }).click();
    await expect(page.getByText('Zoom Enterprise').first()).toBeVisible();
    await page.getByRole('button', { name: /Trigger Incoming Boss Call/i }).click();
    await expect(page.getByText(/Richard Vance \(VP of Synergy\)/i)).toBeVisible();

    // Fake Hacker Terminal Boss Screen
    await page.goto('/fake-hacker-terminal-screen', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Fake Hacker Terminal/i);
    await expect(page.locator('.tm-boss-overlay')).toBeVisible();
    await expect(page.getByRole('button', { name: /Share Screen/i })).toBeVisible();

    // Fake Enterprise AI Workspace Boss Screen
    await page.goto('/fake-ai-workspace-boss-screen', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Fake Enterprise AI Workspace/i);
    await expect(page.locator('.tm-boss-overlay')).toBeVisible();
    await expect(page.getByRole('button', { name: /Share Screen/i })).toBeVisible();

    // New findable Game SEO routes + GameShell Share button
    await page.goto('/games/speed-swipe', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Meme Speed Swipe/i);
    await expect(page.locator('.tm-gs-right').getByRole('button', { name: /Share/i })).toBeVisible();

    await page.goto('/games/meme-battle-arena', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Meme Battle Arena/i);
    await expect(page.locator('.tm-gs-right').getByRole('button', { name: /Share/i })).toBeVisible();

    // Lobby shows 15 Retro Cabinets + Funny Boss Key & Prank Screens section
    await page.goto('/games', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/15 Retro Cabinets/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Funny Boss Key & Prank Screens/i })).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('www.thememes.net stamp writes single electric-blue badge with lightning bolt and never doubles on re-stamp', async ({
    page
  }) => {
    // 1. Direct spy verification against canvasMutator.stampArcadeCartridgeFooter
    const textCalls = [];
    const fillColors = [];
    let currentFill = '';
    const spyCtx = {
      canvas: { width: 800, height: 600 },
      font: '',
      globalAlpha: 1,
      lineWidth: 1,
      strokeStyle: '',
      shadowColor: '',
      shadowBlur: 0,
      textAlign: 'left',
      textBaseline: 'alphabetic',
      get fillStyle() {
        return currentFill;
      },
      set fillStyle(val) {
        currentFill = val;
        fillColors.push(val);
      },
      save() {},
      restore() {},
      measureText(txt) {
        return { width: txt.length * 8 };
      },
      beginPath() {},
      roundRect() {},
      rect() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      fill() {},
      stroke() {},
      fillRect() {},
      strokeRect() {},
      fillText(txt) {
        textCalls.push({ txt, color: currentFill });
      }
    };

    stampArcadeCartridgeFooter(spyCtx, 800, 600);
    expect(textCalls).toEqual([{ txt: 'www.thememes.net', color: '#00f3ff' }]);
    expect(fillColors).toContain('#070810');
    expect(fillColors).toContain('#00f3ff');

    // 2. Real Chromium canvas pixel verification: pre-existing wider legacy bottom-right stamp is cleanly replaced
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const pixelCheck = await page.evaluate((fnSrc) => {
      const stampFn = new Function(`return (${fnSrc})`)();
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');

      // Bright magenta background
      ctx.fillStyle = '#e0e7ff';
      ctx.fillRect(0, 0, 800, 600);

      // Simulate an older wide legacy `#070810` + `#00f3ff` pill extending left of x=520
      const legacyX = 430;
      const legacyY = 562;
      ctx.fillStyle = '#070810';
      ctx.fillRect(legacyX, legacyY, 350, 30);
      ctx.fillStyle = '#00f3ff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('THE MEMES.net  www.thememes.net', legacyX + 12, legacyY + 20);

      // Stamp new badge
      stampFn(ctx, 800, 600);

      // Verify legacy left overhang region around x=440..515 no longer has bright cyan pixels
      const leftData = ctx.getImageData(435, legacyY, 85, 30).data;
      let strayCyanPixels = 0;
      for (let i = 0; i < leftData.length; i += 4) {
        if (leftData[i] < 75 && leftData[i + 1] > 175 && leftData[i + 2] > 200) {
          strayCyanPixels += 1;
        }
      }

      // Verify bottom-right badge area does contain electric-blue pixels
      const rightData = ctx.getImageData(640, 560, 155, 38).data;
      let badgeCyanPixels = 0;
      for (let i = 0; i < rightData.length; i += 4) {
        if (rightData[i] < 75 && rightData[i + 1] > 175 && rightData[i + 2] > 200) {
          badgeCyanPixels += 1;
        }
      }

      return { strayCyanPixels, badgeCyanPixels };
    }, stampArcadeCartridgeFooter.toString());

    expect(pixelCheck.strayCyanPixels).toBe(0);
    expect(pixelCheck.badgeCyanPixels).toBeGreaterThan(20);
  });
});

test.describe('Phase 33.5 ReportSheet & Moderation Queue layout', () => {
  for (const vp of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 }
  ]) {
    test(`ReportSheet & /admin/moderation at ${vp.width}x${vp.height}`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await page.setViewportSize(vp);
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const reportBtn = page.locator('button[aria-label*="Report" i]').first();
      await expect(reportBtn).toBeVisible({ timeout: 15000 });
      await reportBtn.click();

      const sheet = page.locator('.tm-report-sheet');
      await expect(sheet).toBeVisible({ timeout: 5000 });

      const sheetOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(sheetOverflow).toBeLessThanOrEqual(2);

      await page.locator('.tm-report-cancel').click();
      await expect(sheet).toBeHidden({ timeout: 5000 });

      await page.goto('/admin/moderation', { waitUntil: 'domcontentloaded' });
      const modPage = page.locator('.tm-mod-page');
      await expect(modPage).toBeVisible({ timeout: 10000 });
      await expect(modPage).toContainText(/Moderators only/i);

      const modOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(modOverflow).toBeLessThanOrEqual(2);
      expect(pageErrors).toEqual([]);
    });
  }
});


test.describe('Phase 33.6 Honest Accounts & Magic Link', () => {
  for (const vp of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 }
  ]) {
    test(`Fake cache purge, no Quick Play, Magic Link stays signed out at ${vp.width}x${vp.height}`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await page.route('**/auth/v1/otp*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        });
      });

      await page.setViewportSize(vp);
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Inject a stale fake local user from before 33.6 and reload: boot must purge it.
      await page.evaluate(() => {
        localStorage.setItem(
          'tm_user',
          JSON.stringify({
            id: 'arcade-12345',
            username: 'FakeBoss',
            verified: true,
            provider: 'ArcadePass'
          })
        );
      });
      await page.reload({ waitUntil: 'domcontentloaded' });

      await expect(page.locator('.tm-nav')).toBeVisible({ timeout: 15000 });
      const purgedUser = await page.evaluate(() => localStorage.getItem('tm_user'));
      expect(purgedUser).toBeNull();

      // Open AuthModal using desktop Sign In button or mobile bottom dock Profile button
      const desktopSignIn = page.locator('.tm-auth-cta');
      if (await desktopSignIn.isVisible()) {
        await desktopSignIn.click();
      } else {
        const mobileProfileBtn = page.locator('.tm-dock-btn', { hasText: 'Profile' });
        await expect(mobileProfileBtn).toBeVisible({ timeout: 5000 });
        await mobileProfileBtn.click();
      }

      const authModal = page.locator('.tm-auth-modal');
      await expect(authModal).toBeVisible({ timeout: 5000 });

      // Quick Play must no longer exist
      await expect(authModal.getByRole('button', { name: /Quick Play/i })).toHaveCount(0);

      // Submit Magic Link without clicking emailed link: confirmation appears, user remains signed out
      await authModal.locator('.tm-auth-tab', { hasText: /Magic Link/i }).click();
      await authModal.locator('input[type="email"]').fill('honest.check@example.com');
      await authModal.getByRole('button', { name: /Send Magic Link/i }).click();

      await expect(authModal.locator('.tm-auth-feedback')).toContainText(/Magic Link sent/i, {
        timeout: 5000
      });
      const userAfterMagic = await page.evaluate(() => localStorage.getItem('tm_user'));
      expect(userAfterMagic).toBeNull();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(2);
      expect(pageErrors).toEqual([]);
    });
  }
});

test.describe('Phase 33.7 Rate Limits & Arcade Cooldown Copy', () => {
  for (const vp of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 }
  ]) {
    test(`Vote and comment 429 cooldowns render friendly arcade toast at ${vp.width}x${vp.height}`, async ({
      page
    }) => {
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      // Mock feed with one deterministic approved server meme so vote/comment hit the mocked RPC/Edge paths
      await page.route('**/rest/v1/memes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '00000000-0000-4000-8000-000000000999',
              title: 'Rate Limit Check Meme',
              category: 'dank',
              image_url: '/og/seed-dank-01.png',
              author_name: 'NeonOtter_337',
              score: 5,
              reactions: { '🔥': 1, '💀': 0, '😂': 0, '🗿': 0 },
              media_type: 'image',
              status: 'approved',
              created_at: new Date().toISOString(),
              comments: []
            }
          ])
        });
      });

      // Mock anonymous session creation & vote/comment rate-limit responses
      await page.route('**/auth/v1/signup*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-anon-jwt',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh',
            user: {
              id: '00000000-0000-4000-8000-000000000337',
              is_anonymous: true,
              aud: 'authenticated',
              role: 'authenticated'
            }
          })
        });
      });
      await page.route('**/rest/v1/rpc/get_my_profile*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, id: '00000000-0000-4000-8000-000000000337', role: 'user' })
        });
      });
      await page.route('**/rest/v1/rpc/cast_vote*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            error: 'rate_limited',
            retry_after_seconds: 240,
            message: '⏳ Cool your jets, speed racer. Try again in 4 min.'
          })
        });
      });
      await page.route('**/functions/v1/post-comment*', async (route) => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: { 'Retry-After': '9' },
          body: JSON.stringify({
            ok: false,
            error: 'rate_limited',
            retry_after_seconds: 9,
            message: '⏳ Cool your jets, speed racer. Try again in 9 sec.'
          })
        });
      });

      await page.setViewportSize(vp);
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const firstCard = page.locator('.tm-card').first();
      await expect(firstCard).toBeVisible({ timeout: 15000 });
      await expect(firstCard).toContainText(/Rate Limit Check Meme/i);

      // Trigger upvote -> hits mocked rate_limited:240 -> 4 min arcade toast
      await firstCard.locator('.tm-vote-btn.up').click();
      await expect(page.locator('.tm-goblin-toast')).toContainText(
        /Cool your jets, speed racer\. Try again in 4 min\./i,
        { timeout: 5000 }
      );

      // Open comments on first card and post -> hits mocked 429 -> 9 sec arcade toast
      await firstCard.locator('button[title="Toggle Comments"]').click();
      const commentInput = firstCard.locator('.tm-comment-form input');
      await expect(commentInput).toBeVisible({ timeout: 5000 });
      await commentInput.fill('testing rate limit toast');
      await firstCard.locator('.tm-comment-form button[type="submit"]').click();
      await expect(page.locator('.tm-goblin-toast')).toContainText(
        /Cool your jets, speed racer\. Try again in 9 sec\./i,
        { timeout: 5000 }
      );

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(2);
      expect(pageErrors).toEqual([]);
    });
  }
});

test.describe('Phase 33.8 Tamper-Resistant Votes, Reactions, Comments & Notifications', () => {
  for (const vp of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 }
  ]) {
    test(`Votes, reactions, and author comment delete use server RPCs/RLS cleanly at ${vp.width}x${vp.height}`, async ({
      page
    }) => {
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const callerId = '00000000-0000-4000-8000-000000000338';
      const otherId = '00000000-0000-4000-8000-000000000999';
      const memeId = '00000000-0000-4000-8000-000000000888';
      const otherCommentId = '00000000-0000-4000-8000-000000000701';
      const ownCommentId = '00000000-0000-4000-8000-000000000702';

      let legacyScoreCalls = 0;
      const castVoteBodies = [];
      const toggleReactionBodies = [];
      let deleteCommentCalled = false;

      await page.route('**/rest/v1/memes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: memeId,
              title: 'Tamper Resistant Engagement Meme',
              category: 'dank',
              image_url: '/og/seed-dank-01.png',
              author_name: 'NeonOtter_338',
              score: 5,
              reactions: { '🔥': 1, '💀': 0, '😂': 0, '🗿': 0 },
              media_type: 'image',
              status: 'approved',
              created_at: new Date().toISOString(),
              comments: [
                {
                  id: otherCommentId,
                  meme_id: memeId,
                  author_name: 'OtherMemer',
                  body: 'Someone else comment',
                  user_id: otherId,
                  created_at: new Date().toISOString()
                }
              ]
            }
          ])
        });
      });

      await page.route('**/auth/v1/signup*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-anon-jwt-338',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh-338',
            user: {
              id: callerId,
              is_anonymous: true,
              aud: 'authenticated',
              role: 'authenticated'
            }
          })
        });
      });
      await page.route('**/rest/v1/rpc/get_my_profile*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, id: callerId, role: 'user' })
        });
      });
      await page.route('**/rest/v1/votes*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      });
      await page.route('**/rest/v1/reactions*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      });
      await page.route('**/rest/v1/notifications*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      });
      await page.route('**/rest/v1/rpc/increment_meme_score*', async (route) => {
        legacyScoreCalls += 1;
        await route.fulfill({ status: 403, contentType: 'application/json', body: '{}' });
      });
      await page.route('**/rest/v1/rpc/cast_vote*', async (route) => {
        const body = route.request().postDataJSON();
        castVoteBodies.push(body);
        const dir = Number(body?.p_direction || 0);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            meme_id: memeId,
            user_vote: dir,
            score: 5 + dir,
            changed: true
          })
        });
      });
      await page.route('**/rest/v1/rpc/toggle_reaction*', async (route) => {
        const body = route.request().postDataJSON();
        toggleReactionBodies.push(body);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            meme_id: memeId,
            emoji: body?.p_emoji || '🔥',
            active: Boolean(body?.p_active),
            reactions: { '🔥': body?.p_active ? 2 : 1, '💀': 0, '😂': 0, '🗿': 0 }
          })
        });
      });
      await page.route('**/functions/v1/post-comment*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            comment: {
              id: ownCommentId,
              meme_id: memeId,
              author_name: 'AnonMemer',
              body: 'My own server comment',
              user_id: callerId,
              created_at: new Date().toISOString()
            }
          })
        });
      });
      await page.route('**/rest/v1/comments*', async (route) => {
        if (route.request().method() === 'DELETE') {
          deleteCommentCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{ id: ownCommentId }])
          });
          return;
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      });

      await page.setViewportSize(vp);
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const firstCard = page.locator('.tm-card').first();
      await expect(firstCard).toBeVisible({ timeout: 15000 });
      await expect(firstCard).toContainText(/Tamper Resistant Engagement Meme/i);

      // Upvote calls cast_vote (never increment_meme_score) and moves score 5 -> 6
      await firstCard.locator('.tm-vote-btn.up').click();
      await expect(firstCard.locator('.tm-score')).toHaveText('6', { timeout: 5000 });
      await expect
        .poll(() => castVoteBodies.some((b) => b?.p_direction === 1), { timeout: 5000 })
        .toBe(true);
      expect(legacyScoreCalls).toBe(0);

      // Reaction calls toggle_reaction and updates 🔥 to 2 without bumping score above 6
      await firstCard.locator('.tm-react-group .tm-react-btn').first().click();
      await expect(firstCard.locator('.tm-react-group .tm-react-btn').first()).toContainText('2', {
        timeout: 5000
      });
      await expect
        .poll(() => toggleReactionBodies.some((b) => b?.p_emoji === '🔥' && b?.p_active === true), { timeout: 5000 })
        .toBe(true);
      await expect(firstCard.locator('.tm-score')).toHaveText('6');

      // Open comments: only caller's own comment should get the delete button, not other user's comment
      await firstCard.locator('button[title="Toggle Comments"]').click();
      await expect(firstCard).toContainText('Someone else comment');
      await expect(firstCard.locator('button[aria-label="Delete your comment"]')).toHaveCount(0);

      await firstCard.locator('.tm-comment-form input').fill('My own server comment');
      await firstCard.locator('.tm-comment-form button[type="submit"]').click();
      await expect(firstCard).toContainText('My own server comment', { timeout: 5000 });

      const deleteBtn = firstCard.locator('button[aria-label="Delete your comment"]');
      await expect(deleteBtn).toHaveCount(1);
      await deleteBtn.click();
      await expect(firstCard).not.toContainText('My own server comment', { timeout: 5000 });
      expect(deleteCommentCalled).toBe(true);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(2);
      expect(pageErrors).toEqual([]);
    });
  }
});

function buildOver10SecGifBuffer() {
  const out = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0x00, 0, 0];
  for (let i = 0; i < 12; i += 1) {
    // 100 centiseconds = 1s per frame -> 12s total
    out.push(0x21, 0xf9, 0x04, 0x00, 100, 0, 0x00, 0x00);
    out.push(0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0x80);
    out.push(0, 0, 0, 255, 255, 255);
    out.push(0x02, 0x02, 0x44, 0x01, 0x00);
  }
  out.push(0x3b);
  return Buffer.from(out);
}

test.describe('Phase 33.9 Video Paused & GIF Limits', () => {
  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 }
  ];

  for (const vp of viewports) {
    test(`rejects video uploads cleanly and enforces GIF limits on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page
    }) => {
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));

      await page.setViewportSize(vp);
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const uploadShell = page.locator('.tm-quick-upload-shell');
      await expect(uploadShell).toBeVisible({ timeout: 15000 });

      const acceptValues = await page
        .locator('input[type="file"][accept]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('accept') || ''));
      expect(acceptValues.length).toBeGreaterThan(0);
      for (const acc of acceptValues) {
        expect(acc.toLowerCase()).not.toContain('video/');
        expect(acc.toLowerCase()).not.toContain('.mp4');
        expect(acc.toLowerCase()).not.toContain('.mov');
        expect(acc.toLowerCase()).not.toContain('.webm');
        expect(acc.toLowerCase()).toContain('image/gif');
      }

      const quickInput = uploadShell.locator('input[type="file"]').first();
      await quickInput.setInputFiles({
        name: 'clip.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32])
      });
      await expect(uploadShell.locator('.tm-quick-status-msg')).toContainText(
        '🎬 Video memes are coming back soon',
        { timeout: 5000 }
      );

      await quickInput.setInputFiles({
        name: 'too-long.gif',
        mimeType: 'image/gif',
        buffer: buildOver10SecGifBuffer()
      });
      await expect(uploadShell.locator('.tm-quick-status-msg')).toContainText(
        /GIFs must be 10 seconds or shorter/i,
        { timeout: 5000 }
      );

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(2);
      expect(pageErrors).toEqual([]);
    });
  }
});

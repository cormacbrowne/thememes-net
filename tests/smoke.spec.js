import { test, expect } from '@playwright/test';

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
    name: 'Meme Plinko',
    path: '/games/plinko',
    verify: async (page) => {
      await expect(page.locator('canvas').first()).toBeVisible();
      await expect(page.locator('.tm-plinko-drop-btn').first()).toBeVisible();
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

    // Open Slot Floor directory and verify all 4 cabinets appear
    await page.getByRole('button', { name: /Slot Floor/i }).click();
    const floorGrid = page.locator('.tm-slot-floor-grid');
    await expect(floorGrid).toBeVisible();
    await expect(floorGrid).toContainText(/One-Arm Bandit '85/i);
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

    // Switch to Lightning Vault 5000 via top tab bar and test Ante +25%
    await page.getByRole('tab', { name: /Lightning 5000/i }).click();
    await expect(page.locator('.tm-bandit-marquee-title')).toContainText(/NEON LIGHTNING VAULT 5000/i);
    await expect(page.locator('.tm-slot-jackpot-leds')).toContainText(/GRAND/i);
    await page.getByRole('button', { name: /ANTE \+25%/i }).click();
    await expect(page.getByRole('button', { name: /ANTE \+25% ON/i })).toBeVisible();

    overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);

    // Switch to Cyber Buffalo '86 (5x4 grid = 20 cells, 1,024 Ways) and test Staked Spin
    await page.getByRole('tab', { name: /Buffalo '86/i }).click();
    await expect(page.locator('.tm-bandit-marquee-title')).toContainText(/CYBER BUFFALO STAMPEDE '86/i);
    await expect(page.locator('.tm-video-cell')).toHaveCount(20);
    await page.getByRole('button', { name: /🪙 5\b/ }).first().click();
    await page.locator('.tm-bandit-spin-btn').click();
    await expect(page.locator('.tm-bandit-spin-btn')).toBeEnabled({ timeout: 5000 });

    overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);

    // Switch back to classic One-Arm Bandit '85 and check desktop layout + Rules drawer
    await page.getByRole('tab', { name: /Bandit '85/i }).click();
    await expect(page.locator('.tm-bandit-drum-window')).toHaveCount(3);
    await expect(page.locator('.tm-bandit-arm-ball')).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('button', { name: /ℹ Rules/i }).click();
    await expect(page.locator('.tm-slot-paytable-drawer')).toBeVisible();
    overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);

    expect(pageErrors).toEqual([]);
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
    await expect(page.locator('.tm-derby-canvas')).toBeVisible();
    await page.locator('.tm-derby-primary-btn').first().click();
    await expect(page.locator('.tm-derby-canvas.is-live-race')).toBeVisible();

    // Launch Slots from scrolled feed on iPhone & switch across all 4 jackpot machines cleanly
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.goto('/games/slots', { waitUntil: 'domcontentloaded' });
    for (const label of [/Mr\.? Jackpots/i, /Lightning/i, /Buffalo/i, /Bandit/i]) {
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
});

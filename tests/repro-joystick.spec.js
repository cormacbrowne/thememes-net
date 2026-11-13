import { test, expect } from '@playwright/test';

const GAME_IDS = [
  { id: 'pusher', name: /Neon Coin Dozer/i, fixed: true },
  { id: 'roulette', name: /Lightning Roulette/i, fixed: true },
  { id: 'blackjack', name: /Neon 21's/i, fixed: true },
  { id: 'slots', name: /Vegas Slot Arcade/i, fixed: true },
  { id: 'plinko', name: /Meme Plinko/i, fixed: true },
  { id: 'derby', name: /Neon Derby/i, fixed: true },
  { id: 'pinball', name: /Neon Pinball/i, fixed: true },
  { id: 'crush', name: /Meme Crush Saga/i, fixed: true },
  { id: 'guess', name: /Guess The Meme/i, fixed: true },
  { id: 'hilow', name: /Higher or Lower/i, fixed: true },
  { id: 'swipe', name: /Speed Swipe/i, fixed: false },
  { id: 'battle', name: /1v1 Meme Arena/i, fixed: false },
  { id: 'stocks', name: /MEMEDAQ/i, fixed: true }
];

const VIEWPORTS = [
  { name: 'iphone-390x844', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'tablet-768x1024', width: 768, height: 1024, isMobile: false, hasTouch: true },
  { name: 'desktop-1280x800', width: 1280, height: 800, isMobile: false, hasTouch: false }
];

async function assertLobbyVisibleInViewport(page, vp, label) {
  const heading = page.getByRole('heading', { name: /Cyber-Arcade Lobby/i });
  await expect(heading, `${label}: lobby heading should be visible`).toBeVisible({ timeout: 5000 });
  const box = await heading.boundingBox();
  expect(box, `${label}: lobby heading should have boundingBox`).toBeTruthy();
  expect(box.height, `${label}: lobby heading height > 0`).toBeGreaterThan(0);

  // Check whether the viewport actually shows visible lobby UI (not scrolled blank!)
  const scrollInfo = await page.evaluate(() => {
    const lobby = document.querySelector('.tm-lobby');
    const lobbyRect = lobby ? lobby.getBoundingClientRect() : null;
    const rootRect = document.getElementById('root')?.getBoundingClientRect();
    const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return {
      scrollY: window.scrollY,
      innerHeight: window.innerHeight,
      docHeight: document.documentElement.scrollHeight,
      lobbyRect: lobbyRect
        ? { top: lobbyRect.top, bottom: lobbyRect.bottom, height: lobbyRect.height }
        : null,
      rootHeight: rootRect?.height || 0,
      centerTag: centerEl?.tagName,
      centerClass: centerEl?.className || ''
    };
  });

  expect(
    scrollInfo.lobbyRect && scrollInfo.lobbyRect.bottom > 0 && scrollInfo.lobbyRect.top < vp.height,
    `${label}: lobby must overlap viewport, got ${JSON.stringify(scrollInfo)}`
  ).toBeTruthy();
}

for (const vp of VIEWPORTS) {
  test.describe(`Joystick back-to-menu deep repro (${vp.name})`, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch
    });

    test('Start on /, scroll down, open each game after playing & modal/scroll actions, return via joystick', async ({ page }) => {
      const pageErrors = [];
      const consoleErrors = [];
      await page.route('**/_vercel/insights/*', (route) =>
        route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
      );
      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto('/', { waitUntil: 'domcontentloaded' });
      // Dismiss InsertCoinIntro if present
      const skipIntro = page.locator('button', { hasText: /SKIP INTRO|ENTER FEED|SKIP/i }).first();
      if (await skipIntro.isVisible().catch(() => false)) {
        await skipIntro.click();
      }

      // Scroll way down the feed first!
      await page.evaluate(() => window.scrollTo(0, 3500));
      await page.waitForTimeout(150);

      // Navigate to lobby via joystick button (dock <=820px, navbar >820px)
      if (vp.width <= 820) {
        const dockBtn = page.locator('.tm-mobile-dock .tm-dock-btn', { hasText: 'Games' });
        await dockBtn.click();
      } else {
        const navBtn = page.locator('.tm-nav-mode-pill', { hasText: '🕹️' });
        await navBtn.click();
      }

      await assertLobbyVisibleInViewport(page, vp, 'Feed(scrolled)->Lobby');

      // Now test entering each game, interacting, and clicking joystick to return
      for (const game of GAME_IDS) {
        const cardBtn = page.locator('.tm-lobby-card-play', { hasText: game.name }).first();
        await cardBtn.scrollIntoViewIfNeeded();
        await cardBtn.click();
        await page.waitForTimeout(450);

        // Try interacting inside the game canvas/buttons so timers/audio/modals are active
        const primaryAction = page.locator(
          '.tm-fixed-arcade-bar ~ * button, .tm-arcade-stage button, .tm-shell-stage button, main button'
        );
        const count = await primaryAction.count();
        if (count > 0) {
          for (let i = 0; i < Math.min(count, 4); i++) {
            const btn = primaryAction.nth(i);
            const txt = (await btn.innerText().catch(() => '')).trim();
            if (txt && !/Lobby|Back|Memes|Feed|Upload|Exit|Close|Sign|Auth|Delete|Reset/i.test(txt)) {
              await btn.click({ timeout: 500 }).catch(() => {});
              break;
            }
          }
        }
        await page.waitForTimeout(250);

        // Click joystick button to return to lobby
        if (game.fixed) {
          const lobbyBtn = page.locator('.tm-fixed-back-btn', { hasText: 'Lobby' });
          await expect(lobbyBtn).toBeVisible();
          await lobbyBtn.click();
        } else if (vp.width <= 820) {
          const dockGamesBtn = page.locator('.tm-mobile-dock .tm-dock-btn', { hasText: 'Games' });
          await expect(dockGamesBtn).toBeVisible();
          await dockGamesBtn.click();
        } else {
          const navGamesBtn = page.locator('.tm-nav-mode-pill', { hasText: '🕹️' });
          await expect(navGamesBtn).toBeVisible();
          await navGamesBtn.click();
        }

        await assertLobbyVisibleInViewport(page, vp, `Exit ${game.id}`);
      }

      expect(pageErrors, 'No pageErrors').toEqual([]);
      expect(consoleErrors, 'No consoleErrors').toEqual([]);
    });

    test('Back button + joystick button sequence and rapid switching', async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await page.goto('/games', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: /Cyber-Arcade Lobby/i })).toBeVisible();

      // Switch between fixed and non-fixed games via fixed bar pills and browser back
      await page.locator('.tm-lobby-card-play', { hasText: /Lightning Roulette/i }).first().click();
      await page.waitForTimeout(300);
      if (vp.width > 640) {
        await page.locator('.tm-fixed-game-pill', { hasText: /Pinball/i }).click();
        await page.waitForTimeout(300);
      }
      await page.locator('.tm-fixed-back-btn', { hasText: 'Lobby' }).click();
      await assertLobbyVisibleInViewport(page, vp, 'Switch Roulette->Pinball->Lobby');

      // Now enter Speed Swipe -> open Lobby -> click Back -> click joystick again
      await page.locator('.tm-lobby-card-play', { hasText: /Speed Swipe/i }).first().click();
      await page.waitForTimeout(300);
      await page.goBack();
      await page.waitForTimeout(300);
      if (vp.width <= 820) {
        await page.locator('.tm-mobile-dock .tm-dock-btn', { hasText: 'Games' }).click();
      } else {
        await page.locator('.tm-nav-mode-pill', { hasText: '🕹️' }).click();
      }
      await assertLobbyVisibleInViewport(page, vp, 'Swipe->goBack->Joystick');

      // Enter game with Extras drawer open -> close Extras -> click Lobby
      await page.locator('.tm-lobby-card-play', { hasText: /Coin Dozer/i }).first().click();
      await page.waitForTimeout(300);
      await page.locator('.tm-fixed-icon-btn[aria-label="Open Extras drawer"]').click();
      await page.waitForTimeout(200);
      await page.locator('[aria-label="Close Extras Drawer"]').click();
      await page.waitForTimeout(150);
      await page.locator('.tm-fixed-back-btn', { hasText: 'Lobby' }).click();
      await assertLobbyVisibleInViewport(page, vp, 'Pusher+Extras->Lobby');

      expect(pageErrors).toEqual([]);
    });
  });
}

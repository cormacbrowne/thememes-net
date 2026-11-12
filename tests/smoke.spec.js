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

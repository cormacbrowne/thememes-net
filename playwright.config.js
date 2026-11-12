import fs from 'node:fs';
import { defineConfig, chromium } from '@playwright/test';

const MS_EDGE_WINDOWS = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const hasPlaywrightChromium = (() => {
  try {
    return fs.existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

const launchOptions =
  !hasPlaywrightChromium && process.platform === 'win32' && fs.existsSync(MS_EDGE_WINDOWS)
    ? { executablePath: MS_EDGE_WINDOWS, args: ['--no-first-run', '--no-default-browser-check'] }
    : {};

export default defineConfig({
  testDir: './tests',
  reporter: 'list',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    launchOptions
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000
  }
});

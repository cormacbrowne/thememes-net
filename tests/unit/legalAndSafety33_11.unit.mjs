// Unit tests for Phase 33 task 33.11 — Legal/safety pages, takedown form, honest security checks, and pretend-token wording.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LEGAL_PAGES, LEGAL_ROUTE_PATHS, LEGAL_DRAFT_BANNER } from '../../src/data/legalPages.js';
import { extractStorageObjectPath, collectUserStoragePaths } from '../../supabase/functions/_shared/accountCleanup.js';
import { getSecurityAuditReport } from '../../src/utils/securityGuard.js';
import { submitTakedownRequest, deleteMyAccountAndMemes } from '../../src/utils/serverWrites.js';

test('33.11: all five legal/safety pages exist with DRAFT banner', () => {
  assert.deepEqual(LEGAL_ROUTE_PATHS, ['/rules', '/terms', '/privacy', '/takedown', '/contact']);
  for (const p of LEGAL_ROUTE_PATHS) {
    assert.equal(LEGAL_PAGES[p].badge, LEGAL_DRAFT_BANNER);
    assert.match(LEGAL_PAGES[p].badge, /DRAFT\s*[–-]\s*owner to review/i);
  }
});

test('33.11: extractStorageObjectPath and collectUserStoragePaths extract bucket object paths cleanly', () => {
  const sampleUrl = 'https://otvvphmjojqyjaznjzyo.supabase.co/storage/v1/object/public/memes/u/meme-1.webp';
  assert.equal(extractStorageObjectPath(sampleUrl, 'memes'), 'u/meme-1.webp');
  assert.equal(extractStorageObjectPath('/seed/seed-tech-01.webp', 'memes'), null);
  assert.equal(extractStorageObjectPath('https://otvvphmjojqyjaznjzyo.supabase.co/storage/v1/object/public/memes/../bad', 'memes'), null);

  const keys = collectUserStoragePaths([
    {
      image_url: sampleUrl,
      poster_url: 'https://otvvphmjojqyjaznjzyo.supabase.co/storage/v1/object/public/memes/u/p-1.webp?t=1',
      base_image_url: '/seed/tpl-drake-compare.webp'
    },
    {
      image_url: sampleUrl
    }
  ]);
  assert.deepEqual(keys.sort(), ['u/meme-1.webp', 'u/p-1.webp']);
});

test('33.11: getSecurityAuditReport never fabricates a 100/100 score', () => {
  const report = getSecurityAuditReport();
  assert.equal(report.score, null);
  assert.doesNotMatch(String(report.status), /100\/100|HARDENED/);
  assert.equal(Array.isArray(report.checks), true);
  assert.equal(report.checks.length, 4);
  // Outside DOM/browser window, all DOM-observed checks must honestly report false rather than hardcoded true
  for (const c of report.checks) {
    assert.equal(c.ok, false);
  }
});

test('33.11: submitTakedownRequest calls submit_takedown_request RPC cleanly', async () => {
  const rpcCalls = [];
  const mockClient = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'u-1' } } } })
    },
    rpc: async (name, args) => {
      rpcCalls.push({ name, args });
      return { data: { ok: true, id: 'td-123', meme_id: 'm-123', priority: 95 }, error: null };
    }
  };
  const res = await submitTakedownRequest(mockClient, {
    targetUrl: 'https://www.thememes.net/m/11111111-1111-4111-8111-111111111111',
    kind: 'photo_of_me',
    requesterEmail: 'user@example.com',
    details: 'This is a photo of me uploaded without permission.'
  });
  assert.equal(res.ok, true);
  assert.equal(res.priority, 95);
  assert.equal(rpcCalls[0].name, 'submit_takedown_request');
  assert.equal(rpcCalls[0].args.p_kind, 'photo_of_me');
});

test('33.11: deleteMyAccountAndMemes invokes delete-account function and signs out', async () => {
  let signedOut = false;
  let invoked = null;
  const mockClient = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'u-2' } } } }),
      signOut: async () => {
        signedOut = true;
      }
    },
    functions: {
      invoke: async (fn, opts) => {
        invoked = { fn, opts };
        return { data: { ok: true, deletedMemes: 3, removedFiles: 4 }, error: null };
      }
    }
  };
  const res = await deleteMyAccountAndMemes(mockClient);
  assert.equal(res.ok, true);
  assert.equal(res.deletedMemes, 3);
  assert.equal(res.removedFiles, 4);
  assert.equal(invoked.fn, 'delete-account');
  assert.equal(invoked.opts.body.confirm, true);
  assert.equal(signedOut, true);
});

test('33.11: pretend-token copy excludes gambling phrasing', () => {
  for (const rel of ['src/utils/tokenEconomy.js', 'src/App.jsx', 'src/data/seoRoutes.js', 'src/components/MemeStockMarketGame.jsx']) {
    const content = fs.readFileSync(path.resolve(rel), 'utf8');
    assert.doesNotMatch(content, /gambl/i, `${rel} should not use gambling phrasing`);
  }
});

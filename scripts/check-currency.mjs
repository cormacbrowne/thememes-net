import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const ALLOWLIST_PATH = path.join(__dirname, 'currency-allowlist.json');

const BAD_EMOJI = '🪙';
const BAD_UNIT_RE = /\b\d+\s*(tokens?|coins?|credits?)\b/i;

function loadAllowlist() {
  try {
    const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      allowedPaths: new Set(parsed.allowedPaths || []),
      allowedLines: new Set(parsed.allowedLines || [])
    };
  } catch {
    return { allowedPaths: new Set(), allowedLines: new Set() };
  }
}

function walkJsxFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsxFiles(full, out);
    } else if (entry.name.endsWith('.jsx')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Strip JS line/block comments outside quoted strings/templates while preserving newlines.
 */
function stripCommentsPreservingStrings(src) {
  let out = '';
  let i = 0;
  let mode = 'code'; // 'code' | 'sq' | 'dq' | 'tpl' | 'lc' | 'bc'

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    if (mode === 'code') {
      if (ch === '/' && next === '/') {
        mode = 'lc';
        out += '  ';
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        mode = 'bc';
        out += '  ';
        i += 2;
        continue;
      }
      if (ch === "'") mode = 'sq';
      else if (ch === '"') mode = 'dq';
      else if (ch === '`') mode = 'tpl';
      out += ch;
      i += 1;
      continue;
    }

    if (mode === 'lc') {
      if (ch === '\n' || ch === '\r') {
        mode = 'code';
        out += ch;
      } else {
        out += ' ';
      }
      i += 1;
      continue;
    }

    if (mode === 'bc') {
      if (ch === '*' && next === '/') {
        mode = 'code';
        out += '  ';
        i += 2;
      } else {
        out += ch === '\n' || ch === '\r' ? ch : ' ';
        i += 1;
      }
      continue;
    }

    // String or template literal
    out += ch;
    if (ch === '\\' && i + 1 < src.length) {
      out += src[i + 1];
      i += 2;
      continue;
    }
    if ((mode === 'sq' && ch === "'") || (mode === 'dq' && ch === '"') || (mode === 'tpl' && ch === '`')) {
      mode = 'code';
    }
    i += 1;
  }

  return out;
}

const { allowedPaths, allowedLines } = loadAllowlist();
const files = walkJsxFiles(SRC_DIR);
const failures = [];

for (const filePath of files) {
  const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (allowedPaths.has(relPath)) continue;

  const raw = fs.readFileSync(filePath, 'utf8');
  if (raw.includes(BAD_EMOJI)) {
    const lines = raw.split(/\r?\n/);
    lines.forEach((line, idx) => {
      const key = `${relPath}:${idx + 1}`;
      if (line.includes(BAD_EMOJI) && !allowedLines.has(key)) {
        failures.push(`${key}: forbidden coin emoji ${BAD_EMOJI} -> ${line.trim()}`);
      }
    });
  }

  const clean = stripCommentsPreservingStrings(raw);
  const cleanLines = clean.split(/\r?\n/);
  cleanLines.forEach((line, idx) => {
    const key = `${relPath}:${idx + 1}`;
    const trimmed = line.trim();
    // Skip JSX comment blocks `{/* ... */}`
    if (!trimmed || trimmed.startsWith('{/*')) return;
    if (BAD_UNIT_RE.test(trimmed) && !allowedLines.has(key)) {
      failures.push(`${key}: forbidden non-MemeDollarz amount -> ${trimmed}`);
    }
  });
}

if (failures.length > 0) {
  console.error('[check-currency] MemeDollarz guard failed:');
  failures.forEach((f) => console.error(`  ${f}`));
  console.error('Use formatMoney(...) / <Money /> / <Wallet /> instead of tokens/coins/credits or 🪙.');
  process.exit(1);
}

console.log(`[check-currency] OK (${files.length} JSX files checked, 0 violations).`);

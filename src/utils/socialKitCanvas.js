import { AI_BATTLE_IMAGE_LABEL, isAiBattleImage } from './battleImages.js';
import { SITE_URL } from './shareText.js';
// Plan 2.8 — Social Kit canvas generator (1080x1920 Stories/TikTok & 1080x1080 Square)
// plus suggested daily caption copy for /admin/social.

export const SOCIAL_KIT_FORMATS = Object.freeze({
  story: { id: 'story', label: 'Story / TikTok (1080×1920)', shortLabel: '9:16 Story', width: 1080, height: 1920 },
  square: { id: 'square', label: 'Square Post (1080×1080)', shortLabel: '1:1 Square', width: 1080, height: 1080 }
});

function cleanText(val, fallback = '') {
  const s = String(val || '').trim();
  return s || fallback;
}

function formatEntryCaption(entry) {
  if (!entry) return '';
  return [entry.top_text, entry.bottom_text].map((t) => cleanText(t)).filter(Boolean).join(' / ');
}

/**
 * Generates ready-to-post social caption copy for today's battle or yesterday's winner.
 */
export function buildSocialCaption({
  mode = 'battle',
  battle = null,
  winner = null,
  previousBattle = null,
  runnersUp = [],
  entryCount = 0
} = {}) {
  if (mode === 'winner') {
    const winTitle = cleanText(previousBattle?.title, 'Yesterday’s Daily Caption Battle');
    const winAuthor = cleanText(winner?.author_name, 'AnonymousPlayer').replace(/^@+/, '');
    const winCaption = formatEntryCaption(winner) || 'Champion caption';
    const scorePart = Number.isFinite(Number(winner?.score)) ? ` (${Number(winner.score)} votes)` : '';
    const runnerLines = (Array.isArray(runnersUp) ? runnersUp : [])
      .slice(0, 2)
      .map((entry, idx) => `${idx === 0 ? '🥈' : '🥉'} @${cleanText(entry?.author_name, 'player')}: “${formatEntryCaption(entry)}”`)
      .filter(Boolean);

    return [
      `👑 YESTERDAY’S CAPTION BATTLE CHAMPION!`,
      `Battle: ${winTitle}`,
      `🏆 @${winAuthor}${scorePart}: “${winCaption}”`,
      ...runnerLines,
      ``,
      `Can you beat today’s prompt? Enter free at ${SITE_URL} ⚔️`,
      `Hall of Fame: ${SITE_URL}/hall-of-fame`,
      `#TheMemesNet #CaptionBattle #MemeOfTheDay #FunnyMemes #DailyMeme`
    ].join('\n');
  }

  const title = cleanText(battle?.title, 'Today’s Daily Caption Battle');
  const theme = cleanText(battle?.theme);
  const prompt = cleanText(battle?.prompt, 'Write the funniest caption to take the crown!');
  const countLine = Number(entryCount) > 0 ? `🔥 ${Number(entryCount)} captions in the arena already.` : '🔥 Fresh 24-hour battle just dropped!';

  return [
    `⚔️ TODAY’S CAPTION BATTLE: ${title}`,
    theme ? `🏷️ Theme: ${theme}` : '',
    `💬 ${prompt}`,
    countLine,
    ``,
    `Drop your best caption & vote now at ${SITE_URL} 👑`,
    `Top vote tomorrow wins the 24h Caption King crown!`,
    `#TheMemesNet #CaptionBattle #MemeChallenge #FunnyMemes #MemeGenerator`
  ]
    .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
    .join('\n');
}

function wrapLines(ctx, text, maxWidth, maxLines = 4) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCaptionText(ctx, text, x, y, maxWidth, fontSize) {
  ctx.save();
  ctx.font = `900 ${fontSize}px Impact, "Arial Black", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  const lines = wrapLines(ctx, String(text || '').toUpperCase(), maxWidth, 3);
  const step = Math.round(fontSize * 1.12);
  lines.forEach((line, i) => {
    const yy = y + i * step;
    ctx.lineWidth = Math.max(5, Math.round(fontSize * 0.16));
    ctx.strokeStyle = '#07060f';
    ctx.strokeText(line, x, yy);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, x, yy);
  });
  ctx.restore();
}

export function loadCanvasImage(src) {
  if (!src || typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 6000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Renders a 1080×1920 or 1080×1080 promotional PNG for today's battle or yesterday's winner.
 */
export async function renderSocialKitPng({
  mode = 'battle',
  format = 'story',
  battle = null,
  winner = null,
  previousBattle = null,
  runnersUp = [],
  entryCount = 0
} = {}) {
  const spec = SOCIAL_KIT_FORMATS[format] || SOCIAL_KIT_FORMATS.story;
  const { width, height } = spec;
  const isStory = format === 'story';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1. Synthwave dark canvas background + subtle horizon perspective grid
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#07060f');
  bgGrad.addColorStop(0.55, '#130b2c');
  bgGrad.addColorStop(1, '#1c0a33');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const glowTop = ctx.createRadialGradient(width * 0.25, height * 0.14, 10, width * 0.25, height * 0.14, 480);
  glowTop.addColorStop(0, 'rgba(0, 243, 255, 0.22)');
  glowTop.addColorStop(1, 'rgba(0, 243, 255, 0)');
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, width, height);

  const glowBot = ctx.createRadialGradient(width * 0.8, height * 0.85, 10, width * 0.8, height * 0.85, 520);
  glowBot.addColorStop(0, 'rgba(255, 0, 128, 0.24)');
  glowBot.addColorStop(1, 'rgba(255, 0, 128, 0)');
  ctx.fillStyle = glowBot;
  ctx.fillRect(0, 0, width, height);

  // Subtle synthwave floor grid on lower 28%
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
  ctx.lineWidth = 2;
  const horizonY = Math.round(height * 0.74);
  for (let row = 0; row <= 8; row += 1) {
    const t = row / 8;
    const y = horizonY + t * t * (height - horizonY);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let col = -5; col <= 5; col += 1) {
    ctx.beginPath();
    ctx.moveTo(width / 2 + col * 60, horizonY);
    ctx.lineTo(width / 2 + col * 230, height);
    ctx.stroke();
  }
  ctx.restore();

  // Outer neon frame
  ctx.save();
  ctx.strokeStyle = mode === 'winner' ? 'rgba(255, 184, 0, 0.55)' : 'rgba(0, 243, 255, 0.5)';
  ctx.lineWidth = 6;
  drawRoundedRect(ctx, 28, 28, width - 56, height - 56, 36);
  ctx.stroke();
  ctx.restore();

  // 2. Top Wordmark & Kicker badge
  const topPad = isStory ? 96 : 64;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#00f3ff';
  ctx.font = `900 ${isStory ? 44 : 36}px "Arial Black", system-ui, sans-serif`;
  ctx.fillText('THE MEMES .NET', width / 2, topPad);

  const badgeText =
    mode === 'winner' ? '👑 YESTERDAY’S BATTLE CHAMPION' : '⚔️ TODAY’S CAPTION BATTLE';
  const badgeY = topPad + (isStory ? 34 : 24);
  const badgeW = isStory ? 640 : 560;
  const badgeH = isStory ? 66 : 54;
  drawRoundedRect(ctx, (width - badgeW) / 2, badgeY, badgeW, badgeH, 999);
  ctx.fillStyle = mode === 'winner' ? '#ffb800' : '#00f3ff';
  ctx.fill();
  ctx.fillStyle = '#07060f';
  ctx.font = `900 ${isStory ? 28 : 24}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, width / 2, badgeY + badgeH / 2 + 1);
  ctx.restore();

  // 3. Title & optional theme
  const activeBattle = mode === 'winner' ? previousBattle || battle : battle;
  const titleStr = cleanText(
    activeBattle?.title,
    mode === 'winner' ? 'Caption Battle Crown' : 'Daily Caption Battle'
  );
  const titleY = badgeY + badgeH + (isStory ? 46 : 26);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  const titleSize = isStory ? 54 : 42;
  ctx.font = `900 ${titleSize}px system-ui, sans-serif`;
  const titleLines = wrapLines(ctx, titleStr, width - 130, 2);
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, titleY + idx * (titleSize + 10));
  });
  ctx.restore();

  let contentTop = titleY + titleLines.length * (titleSize + 10) + (isStory ? 26 : 16);
  if (activeBattle?.theme) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = `700 ${isStory ? 30 : 24}px system-ui, sans-serif`;
    ctx.fillText(`🏷️ ${activeBattle.theme}`, width / 2, contentTop + 8);
    ctx.restore();
    contentTop += isStory ? 50 : 38;
  }

  // 4. Center Meme / Battle Image Frame
  const imgUrl = activeBattle?.image_url || battle?.image_url || '';
  const loadedImg = await loadCanvasImage(imgUrl);

  const footerReserve = isStory ? 340 : 225;
  const cardX = 84;
  const cardW = width - cardX * 2;
  const cardH = Math.max(360, height - contentTop - footerReserve);

  ctx.save();
  drawRoundedRect(ctx, cardX, contentTop, cardW, cardH, 28);
  ctx.fillStyle = '#0c081a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.clip();

  if (loadedImg) {
    const scale = Math.min(cardW / loadedImg.width, cardH / loadedImg.height);
    const drawW = loadedImg.width * scale;
    const drawH = loadedImg.height * scale;
    const drawX = cardX + (cardW - drawW) / 2;
    const drawY = contentTop + (cardH - drawH) / 2;
    ctx.drawImage(loadedImg, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = '#181036';
    ctx.fillRect(cardX, contentTop, cardW, cardH);
    ctx.fillStyle = '#a7a0cc';
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔️ THE MEMES.NET DAILY BATTLE', width / 2, contentTop + cardH / 2);
  }

  // Render winner caption over meme frame (or battle invite bar for Today's Battle)
  if (mode === 'winner' && winner) {
    const topCap = cleanText(winner.top_text);
    const botCap = cleanText(winner.bottom_text);
    if (topCap) drawCaptionText(ctx, topCap, width / 2, contentTop + 26, cardW - 48, isStory ? 52 : 42);
    if (botCap) drawCaptionText(ctx, botCap, width / 2, contentTop + cardH - (isStory ? 175 : 135), cardW - 48, isStory ? 52 : 42);
  } else if (battle?.prompt) {
    drawCaptionText(ctx, 'YOUR CAPTION GOES HERE', width / 2, contentTop + cardH - (isStory ? 115 : 88), cardW - 48, isStory ? 44 : 34);
  }
  if (loadedImg && isAiBattleImage(imgUrl)) {
    const labelSize = isStory ? 26 : 22;
    ctx.font = `700 ${labelSize}px system-ui, sans-serif`;
    const labelW = ctx.measureText(AI_BATTLE_IMAGE_LABEL).width + 24;
    const labelH = labelSize + 14;
    const labelX = cardX + cardW - labelW - 14;
    const labelY = contentTop + cardH - labelH - 12;
    ctx.fillStyle = 'rgba(7, 6, 15, 0.86)';
    drawRoundedRect(ctx, labelX, labelY, labelW, labelH, labelH / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(AI_BATTLE_IMAGE_LABEL, labelX + 12, labelY + labelH / 2);
  }
  ctx.restore();

  // 5. Bottom Winner Scoreboard or Battle Prompt + Brand CTA
  const bottomStart = contentTop + cardH + (isStory ? 34 : 20);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (mode === 'winner' && winner) {
    ctx.fillStyle = '#ffd166';
    ctx.font = `900 ${isStory ? 40 : 30}px system-ui, sans-serif`;
    ctx.fillText(`👑 @${cleanText(winner.author_name, 'Player')} • ${Number(winner.score) || 0} votes`, width / 2, bottomStart);

    const runnerText = (Array.isArray(runnersUp) ? runnersUp : [])
      .slice(0, 2)
      .map((r, i) => `${i === 0 ? '🥈' : '🥉'} @${cleanText(r.author_name)}`)
      .join('   •   ');
    if (runnerText) {
      ctx.fillStyle = '#d3cff0';
      ctx.font = `700 ${isStory ? 28 : 22}px system-ui, sans-serif`;
      ctx.fillText(runnerText, width / 2, bottomStart + (isStory ? 54 : 38));
    }
  } else {
    const subPrompt = cleanText(battle?.prompt, 'Enter free & win tomorrow’s 👑 Caption King crown');
    ctx.fillStyle = '#e7e4ff';
    ctx.font = `700 ${isStory ? 32 : 24}px system-ui, sans-serif`;
    const subLines = wrapLines(ctx, subPrompt, width - 120, 2);
    subLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, bottomStart + idx * (isStory ? 42 : 30));
    });
    if (Number(entryCount) > 0 && isStory) {
      ctx.fillStyle = '#7bf5ff';
      ctx.font = '700 28px system-ui, sans-serif';
      ctx.fillText(`✍️ ${Number(entryCount)} entries live — vote & compete`, width / 2, bottomStart + 96);
    }
  }

  // Brand CTA Footer Bar
  const ctaW = width - 168;
  const ctaH = isStory ? 96 : 74;
  const ctaY = height - ctaH - (isStory ? 72 : 52);
  drawRoundedRect(ctx, (width - ctaW) / 2, ctaY, ctaW, ctaH, 24);
  ctx.fillStyle = 'rgba(0, 243, 255, 0.14)';
  ctx.fill();
  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${isStory ? 34 : 26}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText('PLAY FREE AT THEMEMES.NET ⚔️👑', width / 2, ctaY + ctaH / 2 + 1);
  ctx.restore();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not export PNG from canvas.');

  const day = cleanText(activeBattle?.battle_day, new Date().toISOString().slice(0, 10));
  const filename = `thememes-${mode}-${day}-${width}x${height}.png`;
  return { blob, filename, width, height };
}

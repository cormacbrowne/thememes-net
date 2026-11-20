// ==========================================
// HTML5 CANVAS MUTATOR, FX SUITE & CARTRIDGE FOOTER
// ==========================================

export const STUDIO_FILTERS = [
  { id: 'none', label: '✨ Normal' },
  { id: 'deepfry', label: '🌶️ Deep Fry' },
  { id: 'vhs', label: '📺 VHS Glitch' },
  { id: 'pixelate', label: '🕹️ 16-Bit Pixel' },
  { id: 'chaos', label: '🌀 Chaos Zoom' },
  { id: 'cyber', label: '🌆 Cyber Neon' }
];

export const CAPTION_LAYOUTS = [
  { id: 'impact', label: '🕹️ Classic Impact' },
  { id: 'topbar', label: '📱 Modern Top-Bar' },
  { id: 'cyberbar', label: '🌆 Cyber Banner' }
];

/**
 * Loads a File or Blob (from file input, global drag-and-drop, or Ctrl+V clipboard)
 * into an HTMLImageElement, downscaling oversized images to max 1200px for fast canvas performance.
 */
export function loadImageFromFileOrBlob(fileOrBlob) {
  return new Promise((resolve, reject) => {
    if (!fileOrBlob) {
      reject(new Error('No image file provided'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawImg = new Image();
      rawImg.onload = () => {
        const maxDim = 1200;
        if (rawImg.width <= maxDim && rawImg.height <= maxDim) {
          resolve(rawImg);
          return;
        }
        const scale = Math.min(maxDim / rawImg.width, maxDim / rawImg.height);
        const off = document.createElement('canvas');
        off.width = Math.round(rawImg.width * scale);
        off.height = Math.round(rawImg.height * scale);
        const octx = off.getContext('2d');
        octx.drawImage(rawImg, 0, 0, off.width, off.height);

        const optimizedImg = new Image();
        optimizedImg.onload = () => resolve(optimizedImg);
        optimizedImg.onerror = () => resolve(rawImg);
        optimizedImg.src = off.toDataURL('image/jpeg', 0.92);
      };
      rawImg.onerror = () => reject(new Error('Failed to decode image file'));
      rawImg.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Loads a direct remote image URL or data URI safely with CORS enabled.
 */
export function loadImageFromUrl(imageUrl) {
  return new Promise((resolve, reject) => {
    const trimmed = String(imageUrl || '').trim();
    if (!trimmed) {
      reject(new Error('Empty image URL'));
      return;
    }
    const img = new Image();
    const isDataUri = trimmed.startsWith('data:');
    if (!isDataUri) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image from URL (check CORS or link)'));

    if (isDataUri) {
      img.src = trimmed;
    } else {
      const sep = trimmed.includes('?') ? '&' : '?';
      img.src = `${trimmed}${sep}cors_load=${Date.now()}`;
    }
  });
}

/**
 * Renders the base artwork into an offscreen buffer and applies the chosen
 * Viral Glitch / Filter FX ('none' | 'deepfry' | 'vhs' | 'pixelate' | 'chaos' | 'cyber')
 * onto the target studio canvas context.
 */
export function renderArtworkWithFilter(ctx, W, areaY, areaH, filterMode, drawArtworkFn) {
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = W;
  baseCanvas.height = areaH;
  const bctx = baseCanvas.getContext('2d');

  // Apply filter pre-processing if needed
  if (filterMode === 'deepfry') {
    bctx.filter = 'contrast(240%) saturate(320%) brightness(112%)';
  } else if (filterMode === 'cyber') {
    bctx.filter = 'contrast(155%) saturate(185%) hue-rotate(-18deg)';
  }

  drawArtworkFn(bctx, W, areaH);
  bctx.filter = 'none';

  ctx.save();

  if (filterMode === 'pixelate') {
    // 16-Bit Arcade Pixelation down-sample & nearest-neighbor upscale
    const pixelScale = 0.14;
    const pw = Math.max(32, Math.round(W * pixelScale));
    const ph = Math.max(32, Math.round(areaH * pixelScale));
    const tiny = document.createElement('canvas');
    tiny.width = pw;
    tiny.height = ph;
    const tctx = tiny.getContext('2d');
    tctx.drawImage(baseCanvas, 0, 0, pw, ph);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tiny, 0, 0, pw, ph, 0, areaY, W, areaH);
    ctx.imageSmoothingEnabled = true;
  } else if (filterMode === 'chaos') {
    // Multi-pass Chaos Radial Zoom Blur
    ctx.drawImage(baseCanvas, 0, areaY);
    const passes = 5;
    for (let i = 1; i <= passes; i++) {
      const zoom = 1 + i * 0.032;
      const zw = W * zoom;
      const zh = areaH * zoom;
      ctx.globalAlpha = 0.18 / i + 0.04;
      ctx.drawImage(baseCanvas, (W - zw) / 2, areaY + (areaH - zh) / 2, zw, zh);
    }
    ctx.globalAlpha = 1;
  } else if (filterMode === 'vhs') {
    // VHS RGB Split + Glitch Slice Offsets + Scanlines
    ctx.drawImage(baseCanvas, 0, areaY);

    // Chromatic aberration horizontal shift
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.45;
    ctx.drawImage(baseCanvas, -7, areaY);
    ctx.drawImage(baseCanvas, 7, areaY + 1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Horizontal VHS tracking glitch slices
    const slices = [
      { y: 0.18, h: 14, dx: 12 },
      { y: 0.52, h: 10, dx: -15 },
      { y: 0.78, h: 18, dx: 9 }
    ];
    slices.forEach((s) => {
      const sy = Math.round(areaH * s.y);
      ctx.drawImage(baseCanvas, 0, sy, W, s.h, s.dx, areaY + sy, W, s.h);
    });

    // Scanlines + VHS OSD label
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    for (let y = areaY; y < areaY + areaH; y += 4) {
      ctx.fillRect(0, y, W, 2);
    }
    ctx.font = 'bold 14px "Oxanium", "Courier New", monospace';
    ctx.fillStyle = 'rgba(0, 243, 255, 0.85)';
    ctx.textAlign = 'left';
    ctx.fillText('PLAY ▶  SP  04:20:69', 18, areaY + 26);
  } else if (filterMode === 'deepfry') {
    ctx.drawImage(baseCanvas, 0, areaY);
    // Warm laser flare overlay
    const grad = ctx.createRadialGradient(W / 2, areaY + areaH / 2, 30, W / 2, areaY + areaH / 2, W * 0.7);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.18)');
    grad.addColorStop(1, 'rgba(239, 68, 68, 0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, areaY, W, areaH);
  } else if (filterMode === 'cyber') {
    ctx.drawImage(baseCanvas, 0, areaY);
    // Neon Cyan/Magenta Duotone wash
    const grad = ctx.createLinearGradient(0, areaY, W, areaY + areaH);
    grad.addColorStop(0, 'rgba(0, 243, 255, 0.22)');
    grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.08)');
    grad.addColorStop(1, 'rgba(236, 72, 153, 0.26)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, areaY, W, areaH);
  } else {
    ctx.drawImage(baseCanvas, 0, areaY);
  }

  ctx.restore();
}

/**
 * Phase 35.3e: Neon "M" tube mark + `thememes.net` watermark stamped once on exported/shared images and GIFs.
 * Keeps the same pill height as before so existing meme layouts do not shift, and cleanly replaces any
 * legacy bottom-right cartridge stamp so the mark is never stamped twice.
 */
export function stampArcadeCartridgeFooter(ctx, W, H, opts = {}) {
  const label = 'thememes.net';
  // Owner brief 17 Nov 2026: the site address + logo must be clearly readable when a meme is
  // reposted elsewhere (was 2.2% of the short side, too small once a platform recompresses it).
  const fs = Math.max(13, Math.round(Math.min(W, H) * 0.036));
  const pillH = Math.max(18, Math.round(fs * 1.65));
  ctx.save();
  ctx.font = `600 ${fs}px "Oxanium", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const tw = ctx.measureText(label).width;
  const markW = Math.max(10, Math.round(fs * 0.95));
  const markGap = Math.max(5, Math.round(fs * 0.4));
  const pad = Math.round(fs * 0.58);
  const margin = Math.max(6, Math.round(fs * 0.5));
  const pillW = Math.round(markW + markGap + tw + pad * 2);
  const x = W - pillW - margin;
  const y = H - pillH - margin;

  // Clean up any wider legacy `#070810` + `#00f3ff` bottom-right stamp so it never renders twice
  // (stills only: video frames skip this per-frame pixel scan).
  try {
    if (opts && opts.fast) throw new Error('skip');
    const scanLeft = Math.max(0, Math.floor(W * 0.35));
    const scanTop = Math.max(0, y - Math.round(pillH * 0.6));
    const scanW = W - scanLeft;
    const scanH = H - scanTop;
    if (scanW > 0 && scanH > 4) {
      const imgData = ctx.getImageData(scanLeft, scanTop, scanW, scanH);
      const data = imgData.data;
      let leftmostLegacyX = W;
      let topLegacyY = H;
      let foundLeftOverhangCyan = false;
      const localPillStartX = Math.max(0, x - scanLeft);

      for (let py = Math.max(0, y - scanTop - 6); py < scanH; py += 1) {
        for (let px = 0; px < localPillStartX; px += 1) {
          const idx = (py * scanW + px) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          // Match legacy electric-blue/gold/white stamp glyphs sitting inside dark #070810 pill overhang
          const isCyanOrGoldGlyph = (r < 75 && g > 175 && b > 200) || (r > 220 && g > 170 && b < 90);
          if (isCyanOrGoldGlyph) {
            // Confirm dark cartridge neighbor pixel right beside it
            const nIdx = (py * scanW + Math.max(0, px - 2)) * 4;
            const nDark = data[nIdx] < 24 && data[nIdx + 1] < 26 && data[nIdx + 2] < 40;
            if (nDark) {
              foundLeftOverhangCyan = true;
              const absX = scanLeft + px;
              const absY = scanTop + py;
              if (absX < leftmostLegacyX) leftmostLegacyX = absX;
              if (absY < topLegacyY) topLegacyY = absY;
            }
          }
        }
      }

      if (foundLeftOverhangCyan && leftmostLegacyX < x) {
        const cleanX = Math.max(scanLeft, leftmostLegacyX - Math.round(pillH * 0.9));
        const cleanY = Math.max(0, Math.min(y - 2, topLegacyY - Math.round(pillH * 0.45)));
        const cleanW = x + 6 - cleanX;
        const cleanH = H - cleanY;
        const sampleY = Math.max(0, cleanY - 3);
        // Paint vertical sample slices from just above the legacy stamp so artwork or footer bar blends seamlessly
        ctx.drawImage(ctx.canvas, cleanX, sampleY, cleanW, 2, cleanX, cleanY, cleanW, cleanH);
      }
    }
  } catch {
    // Tainted/CORS canvases skip pixel inspection safely
  }

  // Dark night-0 pill + subtle cyan glass border (alpha 0.72 keeps watermark tidy and readable)
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = '#07060f';
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, pillW, pillH, Math.round(pillH * 0.3));
    ctx.fill();
    ctx.lineWidth = Math.max(1, fs * 0.08);
    ctx.strokeStyle = 'rgba(25, 240, 255, 0.38)';
    ctx.stroke();
  } else {
    ctx.fillRect(x, y, pillW, pillH);
    ctx.strokeStyle = 'rgba(25, 240, 255, 0.38)';
    ctx.strokeRect(x, y, pillW, pillH);
  }

  // Chrome Outrun "M" mark + amber-to-cyan horizon underline
  const mx = x + pad;
  const cy = y + pillH / 2;
  const mh = fs * 0.92;
  const topY = cy - mh * 0.52;
  const botY = cy + mh * 0.34;
  const midY = cy + mh * 0.02;
  const hasGrad = typeof ctx.createLinearGradient === 'function';
  ctx.globalAlpha = 0.98;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Chrome Outrun gradient stroke + pink backlight + crisp cyan-white rim
  let mStroke = '#ff2e88';
  if (hasGrad) {
    const mGrad = ctx.createLinearGradient(mx, topY, mx, botY);
    mGrad.addColorStop(0, '#45e3ff');
    mGrad.addColorStop(0.46, '#ffffff');
    mGrad.addColorStop(0.56, '#ff2e88');
    mGrad.addColorStop(1, '#ffe787');
    mStroke = mGrad;
  }

  ctx.shadowColor = 'rgba(255, 46, 136, 0.72)';
  ctx.shadowBlur = Math.max(3, Math.round(fs * 0.32));
  ctx.strokeStyle = mStroke;
  ctx.lineWidth = Math.max(1.8, fs * 0.18);
  ctx.beginPath();
  ctx.moveTo(mx + markW * 0.08, botY);
  ctx.lineTo(mx + markW * 0.08, topY);
  ctx.lineTo(mx + markW * 0.5, midY);
  ctx.lineTo(mx + markW * 0.92, topY);
  ctx.lineTo(mx + markW * 0.92, botY);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#e2fdff';
  ctx.lineWidth = Math.max(0.75, fs * 0.06);
  ctx.stroke();

  // Amber-to-cyan horizon underline under the M
  const underY = botY + Math.max(2, fs * 0.16);
  let barStroke = '#ffb800';
  if (hasGrad) {
    const barGrad = ctx.createLinearGradient(mx, underY, mx + markW, underY);
    barGrad.addColorStop(0, '#ffb800');
    barGrad.addColorStop(0.55, '#ff2e88');
    barGrad.addColorStop(1, '#19f0ff');
    barStroke = barGrad;
  }
  ctx.strokeStyle = barStroke;
  ctx.lineWidth = Math.max(1.1, fs * 0.1);
  ctx.beginPath();
  ctx.moveTo(mx + markW * 0.06, underY);
  ctx.lineTo(mx + markW * 0.94, underY);
  ctx.stroke();

  // Heading font domain text (`thememes.net`)
  ctx.shadowColor = 'rgba(25, 240, 255, 0.5)';
  ctx.shadowBlur = Math.max(2, Math.round(fs * 0.25));
  ctx.fillStyle = '#e2fdff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, mx + markW + markGap, cy + 0.5);
  ctx.restore();
}


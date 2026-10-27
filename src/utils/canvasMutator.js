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
    ctx.font = 'bold 14px "Courier New", monospace';
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
 * Draws the 32px 16-Bit Cyber-Arcade Cartridge Footer on exported/published canvases.
 */
export function stampArcadeCartridgeFooter(ctx, W, H, meta = {}) {
  const footerH = 32;
  const footerY = H - footerH;
  ctx.save();
  ctx.fillStyle = '#070810';
  ctx.fillRect(0, footerY, W, footerH);

  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(W, footerY);
  ctx.stroke();

  ctx.font = '900 12px "Courier New", monospace';
  ctx.fillStyle = '#00f3ff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡ THEMEMES.NET // CYBER-ARCADE', 12, footerY + footerH / 2);

  const gen = Number(meta.generation || 0);
  const author = meta.author || 'AnonMemer';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'right';
  ctx.fillText(`GEN-${gen} • @${author}`, W - 12, footerY + footerH / 2);
  ctx.restore();
}


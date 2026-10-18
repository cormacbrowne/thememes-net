// src/utils/canvasMutator.js

/**
 * Loads a feed meme URL onto your Meme Studio HTML5 Canvas without triggering
 * a Tainted Canvas SecurityError on export.
 */
export function loadMemeIntoStudioCanvas(canvas, imageUrl) {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // CRITICAL: Must be set before assigning src so canvas.toBlob() works
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Match canvas dimensions or scale cleanly to 800px max width
      const maxWidth = 800;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ width: canvas.width, height: canvas.height });
    };

    img.onerror = (err) => reject(new Error('Failed to load parent meme into Studio canvas.'));

    // Cache-bust ensures Chromium doesn't reuse a non-CORS cached image from the feed
    const separator = imageUrl.includes('?') ? '&' : '?';
    img.src = `${imageUrl}${separator}cors_mutate=${Date.now()}`;
  });
}

/**
 * Stamps a sleek 16-bit arcade cartridge banner onto the bottom of the canvas
 * right before uploading or downloading, turning every shared PNG into a viral ad.
 */
export function stampArcadeCartridgeFooter(canvas, { username = 'PLAYER_1', generation = 0 }) {
  const ctx = canvas.getContext('2d');
  const footerHeight = 32;

  // Create an offscreen copy so we expand the canvas height by 32px without squishing the meme
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCanvas.getContext('2d').drawImage(canvas, 0, 0);

  canvas.height += footerHeight;
  ctx.drawImage(tempCanvas, 0, 0);

  const yStart = canvas.height - footerHeight;

  // Dark cyberpunk bar background
  ctx.fillStyle = '#07070c';
  ctx.fillRect(0, yStart, canvas.width, footerHeight);

  // Top neon cyan laser line
  ctx.fillStyle = generation > 0 ? '#ff00ff' : '#00f3ff';
  ctx.fillRect(0, yStart, canvas.width, 2);

  // Retro arcade typography
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textBaseline = 'middle';

  // Left brand tag
  ctx.fillStyle = '#00f3ff';
  ctx.fillText('⚡ THEMEMES.NET', 12, yStart + footerHeight / 2 + 1);

  // Right lineage & creator badge
  const rightText =
    generation > 0
      ? `🧬 GEN-${generation} MUTATION // BY @${username.toUpperCase()}`
      : `🕹️ ORIGINAL DROP // BY @${username.toUpperCase()}`;

  ctx.fillStyle = generation > 0 ? '#ff00ff' : '#39ff14';
  const textWidth = ctx.measureText(rightText).width;
  ctx.fillText(rightText, canvas.width - textWidth - 12, yStart + footerHeight / 2 + 1);
}
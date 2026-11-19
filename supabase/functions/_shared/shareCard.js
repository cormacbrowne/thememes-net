// ==========================================
// Share cards: the picture people see when a meme link is pasted into WhatsApp, iMessage,
// Discord, X, Facebook, Slack… (og:image / twitter:image).
//
// 1200×630 JPEG (the size every link preview expects; JPEG because WhatsApp ignores WebP):
//   ┌──────────────────────────────────────────────┐
//   │ blurred, darkened copy of the meme (cover)   │
//   │        ┌──────────────┐                      │
//   │        │  the meme    │  (contain, centred)  │
//   │        └──────────────┘                      │
//   ├──────────────────────────────────────────────┤
//   │ THE MEMES.net        Make your own meme free │  ← brand bar (PNG asset, 1200×96)
//   └──────────────────────────────────────────────┘
//
// Pure JS: the ImageMagick WASM module is passed in (Deno via npm:, unit tests via node_modules).
// ==========================================

export const SHARE_CARD = {
  width: 1200,
  height: 630,
  bar: 96,
  pad: 22,
  quality: 84,
  /** Never decode anything bigger than this (bytes). Published memes are far smaller. */
  maxSourceBytes: 12 * 1024 * 1024
};

/** 'png' | 'jpeg' | 'webp' | 'gif' | null, from magic bytes only. */
export function sniffCardSource(bytes) {
  if (!bytes || bytes.length < 12) return null;
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'gif';
  return null;
}

/** Where the meme sits inside the card (contain-fit in the area above the bar). */
export function fitInCard(srcW, srcH, card = SHARE_CARD) {
  const areaW = card.width - card.pad * 2;
  const areaH = card.height - card.bar - card.pad * 2;
  const scale = Math.min(areaW / srcW, areaH / srcH);
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  return {
    width,
    height,
    x: Math.round((card.width - width) / 2),
    y: Math.round((card.height - card.bar - height) / 2)
  };
}

/**
 * renderShareCard(magick, memeBytes, barPngBytes) → Uint8Array (JPEG)
 * Throws on anything ImageMagick cannot decode as PNG/JPEG/WebP/GIF (first frame).
 */
export function renderShareCard(m, memeBytes, barPngBytes, card = SHARE_CARD) {
  const type = sniffCardSource(memeBytes);
  if (!type) throw new Error('unsupported_source');
  if (memeBytes.length > card.maxSourceBytes) throw new Error('source_too_large');
  const { ImageMagick, MagickImage, MagickColor, MagickFormat, MagickGeometry, Point, CompositeOperator, Gravity, Percentage } = m;
  const fmt = { png: MagickFormat.Png, jpeg: MagickFormat.Jpeg, webp: MagickFormat.WebP, gif: MagickFormat.Gif }[type];
  const areaH = card.height - card.bar;

  const canvas = MagickImage.create(new MagickColor('#07060f'), card.width, card.height);
  try {
    ImageMagick.read(memeBytes, fmt, (meme) => {
      meme.autoOrient();
      meme.strip();
      meme.resetPage();

      // Background: the meme scaled to cover the picture area, heavily blurred and darkened.
      meme.clone((bg) => {
        const g = new MagickGeometry(card.width, areaH);
        g.fillArea = true;
        bg.resize(g);
        bg.crop(card.width, areaH, Gravity.Center);
        bg.resetPage();
        bg.blur(0, 22);
        bg.brightnessContrast(new Percentage(-48), new Percentage(-12));
        canvas.composite(bg, CompositeOperator.Over, new Point(0, 0));
      });

      // Foreground: the whole meme, contain-fitted and centred.
      const fit = fitInCard(meme.width, meme.height, card);
      meme.clone((fg) => {
        const g = new MagickGeometry(fit.width, fit.height);
        g.ignoreAspectRatio = true;
        fg.resize(g);
        canvas.composite(fg, CompositeOperator.Over, new Point(fit.x, fit.y));
      });
    });

    ImageMagick.read(barPngBytes, MagickFormat.Png, (bar) => {
      canvas.composite(bar, CompositeOperator.Over, new Point(0, areaH));
    });

    canvas.strip();
    canvas.quality = card.quality;
    return canvas.write(MagickFormat.Jpeg, (d) => new Uint8Array(d));
  } finally {
    canvas.dispose();
  }
}

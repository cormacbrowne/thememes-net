// ==========================================
// Phase 33 task 33.2 — server-side image re-encoding for `publish-meme`.
// The ImageMagick WASM module is passed in (Deno imports it via `npm:`, the unit tests via
// node_modules), so this file has no runtime-specific imports.
//
// Every accepted file is DECODED and RE-ENCODED, never copied byte-for-byte:
//   • stills (PNG/JPEG/WebP) → WebP, auto-oriented, all metadata stripped (EXIF/GPS/XMP/ICC
//     comments), longest side ≤ 1600 px. Re-encoding also destroys polyglot payloads.
//   • GIFs → coalesced, stripped, resized, re-written as GIF (+ a WebP poster of frame 1).
// The decoder is always told the format we sniffed from the magic bytes, so ImageMagick
// never auto-detects a dangerous coder (SVG, MVG, MSL, PS, …) from file contents.
// ==========================================
import { PUBLISH_LIMITS, PUBLISH_ERRORS, fitWithin, dHashFromRgb } from './publishCore.js';

const STILL_QUALITY = 82;
export const GIF_MAX_FRAMES = 300;

class CodecError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

let limitsApplied = false;
function applyResourceLimits(m) {
  if (limitsApplied) return;
  const { ResourceLimits } = m;
  if (ResourceLimits) {
    ResourceLimits.width = 12000n;
    ResourceLimits.height = 12000n;
    ResourceLimits.area = BigInt(PUBLISH_LIMITS.MAX_SOURCE_PIXELS) * 4n;
    ResourceLimits.listLength = BigInt(GIF_MAX_FRAMES + 1);
  }
  limitsApplied = true;
}

function formatFor(m, sniffed) {
  const F = m.MagickFormat;
  return { png: F.Png, jpeg: F.Jpeg, webp: F.WebP, gif: F.Gif }[sniffed] || null;
}

function perceptualHash(m, image) {
  return image.clone((c) => {
    const g = new m.MagickGeometry(9, 8);
    g.ignoreAspectRatio = true;
    c.alpha(m.AlphaAction.Remove);
    c.resize(g);
    const rgb = c.getPixels((p) => p.toByteArray(0, 0, 9, 8, 'RGB'));
    return dHashFromRgb(rgb, 9, 8);
  });
}

function checkPixels(width, height) {
  if (width * height > PUBLISH_LIMITS.MAX_SOURCE_PIXELS) throw new CodecError(PUBLISH_ERRORS.TOO_MANY_PIXELS);
}

function encodeStill(m, image) {
  image.autoOrient();
  image.strip();
  const fit = fitWithin(image.width, image.height);
  if (fit.scaled) image.resize(fit.width, fit.height);
  image.quality = STILL_QUALITY;
  const data = image.write(m.MagickFormat.WebP, (d) => new Uint8Array(d));
  return { data, width: image.width, height: image.height };
}

/**
 * transcodeImage(magick, bytes, sniffedType)
 *   → { kind:'image'|'gif', data, contentType, ext, width, height, frames, phash, poster? }
 * Throws Error with .code from PUBLISH_ERRORS on anything it cannot safely decode.
 */
export function transcodeImage(m, bytes, sniffedType) {
  applyResourceLimits(m);
  const format = formatFor(m, sniffedType);
  if (!format) throw new CodecError(PUBLISH_ERRORS.UNSUPPORTED);
  const { ImageMagick } = m;

  try {
    if (sniffedType !== 'gif') {
      return ImageMagick.read(bytes, format, (image) => {
        checkPixels(image.width, image.height);
        const phash = perceptualHash(m, image);
        const out = encodeStill(m, image);
        return { kind: 'image', contentType: 'image/webp', ext: 'webp', frames: 1, phash, ...out };
      });
    }

    return ImageMagick.readCollection(bytes, format, (frames) => {
      if (!frames.length) throw new CodecError(PUBLISH_ERRORS.UNDECODABLE);
      if (frames.length > GIF_MAX_FRAMES) throw new CodecError(PUBLISH_ERRORS.TOO_MANY_PIXELS);
      frames.coalesce();
      const first = frames[0];
      checkPixels(first.width, first.height);
      if (first.width * first.height * frames.length > PUBLISH_LIMITS.MAX_SOURCE_PIXELS * 4) {
        throw new CodecError(PUBLISH_ERRORS.TOO_MANY_PIXELS);
      }
      const phash = perceptualHash(m, first);
      const fit = fitWithin(first.width, first.height);
      for (const frame of frames) {
        frame.strip();
        if (fit.scaled) frame.resize(fit.width, fit.height);
      }
      const data = frames.write(m.MagickFormat.Gif, (d) => new Uint8Array(d));
      const poster = frames[0].clone((p) => encodeStill(m, p));
      return {
        kind: 'gif',
        contentType: 'image/gif',
        ext: 'gif',
        data,
        width: fit.width,
        height: fit.height,
        frames: frames.length,
        phash,
        poster: { ...poster, contentType: 'image/webp', ext: 'webp' }
      };
    });
  } catch (err) {
    if (err instanceof CodecError) throw err;
    throw new CodecError(PUBLISH_ERRORS.UNDECODABLE);
  }
}

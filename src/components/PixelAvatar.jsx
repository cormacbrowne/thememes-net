import { avatarRectsForPreset, defaultPixelAvatarForHandle, getPixelAvatarById, PIXEL_AVATAR_IDS } from '../utils/pixelAvatars';

export default function PixelAvatar({
  avatarId = null,
  handle = 'anon',
  size = 64,
  frame = '',
  className = ''
}) {
  const preset =
    avatarId && PIXEL_AVATAR_IDS.includes(String(avatarId).toLowerCase())
      ? getPixelAvatarById(avatarId)
      : defaultPixelAvatarForHandle(handle);
  const rects = avatarRectsForPreset(preset);

  return (
    <div
      className={`tm-pixel-avatar-box ${frame ? `tm-frame-${frame}` : ''} ${className}`.trim()}
      data-avatar-id={preset.id}
      title={`${preset.name} (Built-in Pixel Avatar)`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${Math.max(10, Math.round(size * 0.22))}px`,
        background: preset.bg,
        border: `2px solid ${preset.accent}`,
        boxShadow: `0 0 18px ${preset.accent}55`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: `${Math.max(4, Math.round(size * 0.12))}px`
      }}
    >
      <svg
        viewBox="0 0 8 8"
        shapeRendering="crispEdges"
        width="100%"
        height="100%"
        aria-label={`${preset.name} pixel avatar`}
      >
        {rects.map((r) => (
          <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width="1" height="1" fill={r.fill} />
        ))}
      </svg>
    </div>
  );
}

import { PIXEL_AVATARS } from '../utils/pixelAvatars';
import PixelAvatar from './PixelAvatar';

export default function PixelAvatarPicker({
  selectedAvatarId,
  saving = false,
  statusMessage = '',
  onSelectAvatar
}) {
  return (
    <div className="tm-avatar-picker-box" data-testid="pixel-avatar-picker">
      <div className="tm-avatar-picker-head">
        <span>🎨 PICK YOUR 8-BIT PIXEL AVATAR</span>
        <span className="tm-avatar-picker-hint">Built-in pixel art only · no uploads</span>
      </div>
      <div className="tm-avatar-picker-grid" role="radiogroup" aria-label="Built-in pixel-art avatars">
        {PIXEL_AVATARS.map((preset) => {
          const active = preset.id === selectedAvatarId;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={saving}
              data-testid={`pixel-avatar-option-${preset.id}`}
              className={`tm-avatar-choice-btn ${active ? 'active' : ''}`}
              onClick={() => onSelectAvatar?.(preset.id)}
              title={preset.name}
            >
              <PixelAvatar avatarId={preset.id} size={40} />
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>
      {statusMessage && (
        <div className="tm-avatar-picker-status" role="status">
          {statusMessage}
        </div>
      )}
    </div>
  );
}

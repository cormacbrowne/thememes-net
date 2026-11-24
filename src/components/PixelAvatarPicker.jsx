import { Grid3x3 } from 'lucide-react';
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
        <span className="tm-avatar-picker-title">
          <Grid3x3 size={14} strokeWidth={1.9} aria-hidden="true" />
          <span>Pixel Avatar</span>
        </span>
        <span className="tm-avatar-picker-hint">Built-in pixel art</span>
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
              <PixelAvatar avatarId={preset.id} size={36} quiet={!active} />
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

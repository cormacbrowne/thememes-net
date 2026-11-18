import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ThousandGame.css';

/** Full-screen dialog rendered on <body>, so game-shell zoom / transforms can't clip it. */
export default function ThousandModal({ label, title, onClose, className = '', children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="tk-modal" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className={`tk-modal-box ${className}`} onClick={(e) => e.stopPropagation()}>
        <div className="tk-modal-head">
          <h2>{title}</h2>
          <button type="button" className="tk-btn" onClick={onClose} data-testid="tk-modal-close">
            ✕ Close
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

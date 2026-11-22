import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

let activeScrollLocks = 0;
let savedBodyOverflow = '';

function getFocusableElements(container) {
  if (!container || typeof window === 'undefined') return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
  });
}

export default function Sheet({
  onClose,
  labelledBy,
  label,
  initialFocusRef,
  backdropClassName = '',
  panelClassName = '',
  children
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const previousFocused = document.activeElement;
    if (activeScrollLocks === 0) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeScrollLocks += 1;

    const panel = panelRef.current;
    const initialTarget =
      initialFocusRef?.current || getFocusableElements(panel)[0] || panel;
    initialTarget?.focus?.();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = getFocusableElements(panelRef.current);
      if (focusables.length === 0) {
        e.preventDefault();
        panelRef.current?.focus?.();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (!panelRef.current?.contains(active) || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!panelRef.current?.contains(active) || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      activeScrollLocks = Math.max(0, activeScrollLocks - 1);
      if (activeScrollLocks === 0) {
        document.body.style.overflow = savedBodyOverflow;
      }
      if (
        previousFocused &&
        previousFocused instanceof HTMLElement &&
        previousFocused.isConnected
      ) {
        previousFocused.focus();
      }
    };
  }, [initialFocusRef]);

  const sheetMarkup = (
    <div
      className={`fixed inset-0 flex items-end justify-center min-[861px]:items-center ${backdropClassName}`.trim()}
      style={{
        zIndex: 'calc(var(--tm-z-boss) + var(--tm-z-modal))',
        background: 'color-mix(in srgb, var(--tm-night-0) 78%, transparent)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)'
      }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCloseRef.current?.();
        }
      }}
    >
      <div
        ref={panelRef}
        className={`w-full max-w-[32.5rem] max-h-[92dvh] overflow-auto rounded-t-[var(--tm-radius-sheet)] min-[861px]:rounded-[var(--tm-radius-sheet)] border border-[var(--tm-night-3)] bg-[var(--tm-night-2)] text-[var(--tm-text)] shadow-[var(--tm-shadow-3)] p-[var(--tm-space-4)] pb-[calc(var(--tm-space-4)+var(--tm-safe-bottom))] min-[861px]:pb-[var(--tm-space-4)] ${panelClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || undefined}
        aria-label={!labelledBy ? label : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(sheetMarkup, document.body);
  }
  return sheetMarkup;
}

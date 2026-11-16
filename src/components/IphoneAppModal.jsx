import { useState, useEffect } from 'react';
import { sfx } from '../utils/soundEngine';
import './IphoneAppModal.css';

export default function IphoneAppModal({ onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installDone, setInstallDone] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    sfx.playToggle?.();
    try {
      deferredPrompt.prompt();
      const res = await deferredPrompt.userChoice;
      if (res?.outcome === 'accepted') {
        setInstallDone(true);
      }
    } catch {
      // fallback to manual iPhone instructions shown below
    }
    setDeferredPrompt(null);
  };

  return (
    <div
      className="tm-modal-backdrop tm-iphone-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Make THE MEMES.net an iPhone App"
    >
      <div className="tm-modal-card tm-iphone-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tm-modal-sticky-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/favicon.svg"
              alt="THE MEMES 80s Neon App Icon"
              width="34"
              height="34"
              style={{ borderRadius: '8px' }}
            />
            <h2 style={{ margin: 0, fontSize: '18px', color: '#00f5ff' }}>
              📲 Make THE MEMES an iPhone App
            </h2>
          </div>
          <button
            type="button"
            className="tm-btn"
            onClick={() => {
              sfx.playToggle?.();
              onClose();
            }}
            aria-label="Close iPhone App Instructions"
          >
            ✕ Close
          </button>
        </div>

        <div className="tm-iphone-hero-preview">
          <div className="tm-iphone-icon-showcase">
            <img
              src="/favicon.svg"
              alt="80s Neon App Home Screen Icon Preview"
              className="tm-iphone-preview-img"
              width="92"
              height="92"
            />
            <span className="tm-iphone-icon-label">THE MEMES</span>
          </div>
          <div className="tm-iphone-hero-copy">
            <div className="tm-iphone-badge">★ FULL-SCREEN iOS CYBER-ARCADE EXPERIENCE</div>
            <p>
              Install <strong>THE MEMES.net</strong> right onto your iPhone Home Screen in 10 seconds —
              zero App Store download, full-screen Pinball &amp; Magic 8-Ball play, haptic touch feel,
              and your glowing <strong>80s Neon App Icon</strong>!
            </p>
          </div>
        </div>

        <div className="tm-iphone-steps">
          <div className="tm-iphone-step-card">
            <div className="tm-iphone-step-num">1</div>
            <div>
              <strong>Open thememes.net in Safari on iPhone</strong>
              <p>
                Tap the <strong>Share button (⬆️ square with up arrow)</strong> at the bottom center of
                iPhone Safari.
              </p>
            </div>
          </div>

          <div className="tm-iphone-step-card">
            <div className="tm-iphone-step-num">2</div>
            <div>
              <strong>Tap &ldquo;Add to Home Screen&rdquo; (➕)</strong>
              <p>
                Scroll slightly down the Share menu and tap <strong>Add to Home Screen</strong>.
                You&apos;ll see our new <strong>80s Neon THE MEMES</strong> icon appear.
              </p>
            </div>
          </div>

          <div className="tm-iphone-step-card">
            <div className="tm-iphone-step-num">3</div>
            <div>
              <strong>Tap &ldquo;Add&rdquo; &amp; Launch Full-Screen!</strong>
              <p>
                Open <strong>THE MEMES</strong> straight from your Home Screen icon. Audio Synth,
                Pinball, Magic 8-Ball, Slots &amp; Meme Reels run full-screen with no Safari bars!
              </p>
            </div>
          </div>
        </div>

        <div className="tm-iphone-tip-bar">
          <span>
            💡 <strong>iPhone Sound Tip:</strong> Flip off the side silent switch (or tap unmute inside
            any game / THE MEMES FM radio) for crisp 80s synthwave audio &amp; SFX!
          </span>
        </div>

        {deferredPrompt && !installDone && (
          <button
            type="button"
            className="tm-btn tm-btn-primary tm-iphone-install-cta"
            onClick={handleNativeInstall}
          >
            📲 Install App One-Click Now
          </button>
        )}

        {installDone && (
          <div className="tm-iphone-success-pill">
            ✅ App installation started! Check your Home Screen for the 80s Neon icon.
          </div>
        )}
      </div>
    </div>
  );
}

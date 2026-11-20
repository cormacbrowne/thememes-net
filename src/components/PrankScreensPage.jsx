import { useMemo, useState } from 'react';
import { BOSS_SCREENS_CATALOG } from '../data/arcadeGamesCatalog';
import { PRANK_DISGUISE_TO_PATH } from '../data/seoRoutes';
import { toSearchTerms, itemMatchesSearch } from '../utils/catalogSearch';
import CatalogSearchBox, { CatalogSearchEmpty } from './CatalogSearchBox';
import './PrankScreensPage.css';

/** Tiny CSS-only previews of each prank (no screenshots, no third-party logos). */
function PrankPreview({ id }) {
  switch (id) {
    case 'update':
      return (
        <div className="tm-prank-pv tm-prank-pv--update">
          <span className="tm-prank-spin" />
          <b>Working on updates 69%</b>
          <small>Don&apos;t turn off your PC</small>
        </div>
      );
    case 'bsod':
      return (
        <div className="tm-prank-pv tm-prank-pv--bsod">
          <b className="tm-prank-frown">:(</b>
          <small>Your device ran into a problem…</small>
        </div>
      );
    case 'crackphone':
    case 'crackpad':
      return (
        <div className={`tm-prank-pv tm-prank-pv--crack ${id === 'crackpad' ? 'is-pad' : ''}`}>
          <svg viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none">
            <path d="M58 40 L20 5 M58 40 L95 18 M58 40 L88 92 M58 40 L30 98 M58 40 L4 62 M58 40 L72 2" />
            <path d="M58 40 L44 30 L36 46 L52 58 L70 52 L66 34 Z" />
          </svg>
          <b>9:41</b>
        </div>
      );
    case 'terminal':
      return (
        <div className="tm-prank-pv tm-prank-pv--term">
          <code>$ deploy --prod</code>
          <code>OK rustc: compiled in 1.84s</code>
          <code>WARN pool at 69%</code>
          <code className="tm-prank-caret">▌</code>
        </div>
      );
    case 'zoom':
      return (
        <div className="tm-prank-pv tm-prank-pv--call">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} />
          ))}
          <b>Incoming call…</b>
        </div>
      );
    case 'excel':
      return (
        <div className="tm-prank-pv tm-prank-pv--sheet">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      );
    case 'ai':
      return (
        <div className="tm-prank-pv tm-prank-pv--ai">
          <b>Q4 strategy memo</b>
          <span />
          <span />
          <span className="short" />
        </div>
      );
    case 'secretsanta':
      return (
        <div className="tm-prank-pv tm-prank-pv--santa">
          <b>🎅 SECRET SANTA</b>
          <span>Match: YOUR BOSS</span>
        </div>
      );
    default:
      return <div className="tm-prank-pv" />;
  }
}

/**
 * /prank-screens: every fullscreen prank in one place. onOpen(id) shows the prank fullscreen
 * (the BossKeyOverlay), and the address changes to that prank's own page.
 */
export default function PrankScreensPage({ onOpen }) {
  const [query, setQuery] = useState('');
  const terms = useMemo(() => toSearchTerms(query), [query]);
  const pranks = useMemo(() => BOSS_SCREENS_CATALOG.filter((p) => itemMatchesSearch(p, terms)), [terms]);

  return (
    <div className="tm-prank-page">
      <header className="tm-prank-head">
        <h1>Fake Prank Screens</h1>
        <p>
          Tap a prank, go fullscreen, hand over the phone or computer. Fake updates, crash screens, cracked
          glass and more, all harmless and all free. Press Esc or tap ✕ to end the joke.
        </p>
      </header>

      <div className="tm-prank-search">
        <CatalogSearchBox
          value={query}
          onChange={setQuery}
          placeholder={`Search ${BOSS_SCREENS_CATALOG.length} prank screens…`}
          ariaLabel="Search prank screens"
          testId="prank-page-search"
        />
      </div>

      {terms.length > 0 && pranks.length === 0 && (
        <CatalogSearchEmpty noun="prank screens" query={query} onClear={() => setQuery('')} />
      )}

      <div className="tm-prank-grid">
        {pranks.map((p) => (
          <a
            key={p.id}
            className="tm-prank-card"
            href={PRANK_DISGUISE_TO_PATH[p.id] || p.path}
            style={{ '--tm-prank-accent': p.accent }}
            onClick={(e) => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              onOpen(p.id);
            }}
          >
            <PrankPreview id={p.id} />
            <span className="tm-prank-card-body">
              <strong>
                {p.icon} {p.label}
                {p.isNew && <em className="tm-prank-new">NEW</em>}
              </strong>
              <span>{p.pitch}</span>
              <span className="tm-prank-go">▶ Open fullscreen</span>
            </span>
          </a>
        ))}
      </div>

      <section className="tm-prank-section">
        <h2>How to pull off the perfect prank</h2>
        <ol>
          <li>Pick a screen that fits the device: cracked glass for phones and tablets, update or crash screens for laptops.</li>
          <li>
            Go fullscreen. On a computer press <kbd>F11</kbd> or tap the Fullscreen button; on iPhone, add the page to your
            Home Screen first so the browser bars disappear.
          </li>
          <li>Leave it running and wait. Tapping the update and crash screens makes the progress move so they look alive.</li>
          <li>Reveal the joke with <kbd>Esc</kbd> or the ✕ button before anyone panics.</li>
        </ol>
      </section>

      <section className="tm-prank-section">
        <h2>Are these pranks safe?</h2>
        <p>
          Yes. They are just web pages: nothing is installed, changed or deleted, and closing the page ends the prank.
          They are our own designs made for fun, not real system screens, and THE MEMES.net is not affiliated with any
          operating system, phone or app maker. Only prank people who will laugh about it afterwards.
        </p>
      </section>
    </div>
  );
}

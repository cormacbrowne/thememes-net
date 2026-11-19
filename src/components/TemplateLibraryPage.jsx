import { useMemo, useState } from 'react';
import { MEME_TEMPLATES, getTemplateBySlug, relatedTemplates, TEMPLATES_INDEX_PATH } from '../data/memeTemplates';
import { TEMPLATES_INDEX_META } from '../utils/templateSeo';
import './TemplateLibraryPage.css';

const CATEGORY_LABELS = { all: 'All', relatable: 'Relatable', dank: 'Dank', tech: 'Tech & brainy' };

/** Plain left-clicks navigate inside the app; anything else (new tab, copy link) uses the real href. */
function spaLink(onGo) {
  return (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onGo();
  };
}

function TemplateCard({ t, onOpen, eager = false }) {
  return (
    <a className="tm-tpl-card" href={t.path} onClick={spaLink(() => onOpen(t.slug))}>
      <img
        src={t.thumb}
        alt={`${t.name} meme template`}
        width="360"
        height="360"
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
      <span className="tm-tpl-card-body">
        <strong>{t.name}</strong>
        <span>{t.summary}</span>
      </span>
    </a>
  );
}

function TemplateIndex({ onOpen }) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MEME_TEMPLATES.filter((t) => {
      if (cat !== 'all' && t.category !== cat) return false;
      if (!q) return true;
      return [t.name, t.summary, ...(t.aka || [])].join(' ').toLowerCase().includes(q);
    });
  }, [query, cat]);

  return (
    <>
      <header className="tm-tpl-head">
        <h1>{TEMPLATES_INDEX_META.h1}</h1>
        <p>{TEMPLATES_INDEX_META.intro}</p>
      </header>
      <div className="tm-tpl-filters">
        <input
          type="search"
          className="tm-input"
          placeholder="Search templates, e.g. drake, buttons, brain…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search meme templates"
        />
        <div className="tm-tpl-chips" role="group" aria-label="Filter by category">
          {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`tm-chip ${cat === id ? 'active' : ''}`}
              aria-pressed={cat === id}
              onClick={() => setCat(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="tm-tpl-grid">
          {list.map((t, i) => (
            <TemplateCard key={t.slug} t={t} onOpen={onOpen} eager={i < 6} />
          ))}
        </div>
      ) : (
        <p className="tm-tpl-empty">No templates match “{query}”. Try another word, or upload your own picture in the meme generator.</p>
      )}
    </>
  );
}

function TemplateDetail({ t, onOpen, onUse }) {
  const related = useMemo(() => relatedTemplates(t, 6), [t]);
  return (
    <article className="tm-tpl-detail">
      <nav className="tm-tpl-crumbs" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span aria-hidden="true">›</span>
        <a href={TEMPLATES_INDEX_PATH} onClick={spaLink(() => onOpen(null))}>
          Meme Templates
        </a>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{t.name}</span>
      </nav>

      <div className="tm-tpl-hero">
        <figure className="tm-tpl-hero-img">
          <img src={t.image} alt={`${t.name} meme template, blank`} width={t.width} height={t.height} fetchPriority="high" />
        </figure>
        <div className="tm-tpl-hero-side">
          <h1>{t.name} Meme Template</h1>
          <p className="tm-tpl-lead">{t.summary}</p>
          {t.aka?.length > 0 && <p className="tm-tpl-aka">Also known as: {t.aka.join(', ')}</p>}
          <button type="button" className="tm-btn tm-btn-primary tm-tpl-cta" onClick={() => onUse(t)}>
            ✏️ Use this template
          </button>
          <p className="tm-tpl-cta-note">Free, no sign-up. Type your own text or let 🤖 AI write the joke.</p>
          <a className="tm-tpl-download" href={t.image} download={`${t.slug}-meme-template.webp`}>
            ⬇️ Download the blank template
          </a>
        </div>
      </div>

      <section className="tm-tpl-section">
        <h2>What the {t.name} meme means</h2>
        <p>{t.meaning}</p>
      </section>

      <section className="tm-tpl-section">
        <h2>How to make a {t.name} meme</h2>
        <p>{t.howTo}</p>
        <ol className="tm-tpl-steps">
          <li>Tap <strong>Use this template</strong>.</li>
          <li>
            Fill in the {t.slots.length === 1 ? 'caption box' : `${t.slots.length} caption boxes`} (
            {t.slots.map((s) => s.label).join(', ')}), or type an idea and let the AI Caption Writer suggest three jokes.
          </li>
          <li>Download it, share it to WhatsApp, Discord or anywhere, or post it to the feed.</li>
        </ol>
      </section>

      <section className="tm-tpl-section">
        <h2>{t.name} meme examples</h2>
        <ul className="tm-tpl-examples">
          {t.examples.map((ex, i) => (
            <li key={i}>
              <span>
                {ex.map((line, j) =>
                  line ? (
                    <span key={j} className="tm-tpl-ex-line">
                      <em>{t.slots[j]?.label || `Line ${j + 1}`}:</em> {line}
                    </span>
                  ) : null
                )}
              </span>
              <button type="button" className="tm-btn" onClick={() => onUse(t, ex)}>
                Use this
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="tm-tpl-section">
        <h2>{t.name} meme FAQ</h2>
        <div className="tm-tpl-faq">
          {t.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="tm-tpl-section">
        <h2>More meme templates</h2>
        <div className="tm-tpl-grid tm-tpl-grid-small">
          {related.map((r) => (
            <TemplateCard key={r.slug} t={r} onOpen={onOpen} />
          ))}
        </div>
        <p className="tm-tpl-all">
          <a href={TEMPLATES_INDEX_PATH} onClick={spaLink(() => onOpen(null))}>
            See all {MEME_TEMPLATES.length} meme templates →
          </a>
        </p>
      </section>
    </article>
  );
}

/**
 * Meme Template Library: /templates (index) and /templates/<slug>-meme-template (one template).
 * onOpen(slug|null) navigates inside the library; onUse(template, texts?) opens the editor.
 */
export default function TemplateLibraryPage({ slug, onOpen, onUse }) {
  const t = slug ? getTemplateBySlug(slug) : null;
  return (
    <div className="tm-tpl-page">
      {t ? <TemplateDetail t={t} onOpen={onOpen} onUse={onUse} /> : <TemplateIndex onOpen={onOpen} />}
    </div>
  );
}

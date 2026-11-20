import { Search, X } from 'lucide-react';
import './CatalogSearchBox.css';

/** Pill search box used by the arcade lobby (games + pranks) and /prank-screens. */
export default function CatalogSearchBox({ value, onChange, placeholder, ariaLabel, testId }) {
  return (
    <div className="tm-lobby-search" role="search">
      <Search size={16} className="tm-lobby-search-icon" aria-hidden="true" />
      <input
        type="search"
        className="tm-lobby-search-input"
        placeholder={placeholder}
        aria-label={ariaLabel}
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onChange('');
        }}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      {value && (
        <button
          type="button"
          className="tm-lobby-search-clear"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** "No X match …  Clear search" line shown when a search finds nothing. */
export function CatalogSearchEmpty({ noun, query, onClear, className = 'tm-lobby-empty' }) {
  return (
    <div className={className}>
      No {noun} match &ldquo;{query.trim()}&rdquo;.{' '}
      <button type="button" className="tm-lobby-empty-link" onClick={onClear}>
        Clear search
      </button>
    </div>
  );
}

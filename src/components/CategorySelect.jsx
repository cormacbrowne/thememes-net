import { useMemeCategories } from '../data/memeCategories';

/** One category picker for every upload screen (Quick upload, Studio, Forge). */
export default function CategorySelect({ value, onChange, className = 'tm-input', style }) {
  const cats = useMemeCategories();
  const trending = cats.filter((c) => c.trending);
  const rest = cats.filter((c) => !c.trending);
  const known = cats.some((c) => c.id === value);
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={style}
      aria-label="Meme category"
    >
      {!known && value && <option value={value}>#{String(value).toUpperCase()}</option>}
      {trending.length > 0 && (
        <optgroup label="🔥 Trending now">
          {trending.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="Categories">
        {rest.map((c) => (
          <option key={c.id} value={c.id}>
            {c.emoji} {c.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

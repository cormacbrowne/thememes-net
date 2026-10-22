import { MEME_STOCK_TICKER } from '../data/starterMemes';

export default function ViralTickerBar({
  onSelectCategory,
  onOpenRewards,
  lootSpins
}) {
  const items = [...MEME_STOCK_TICKER, ...MEME_STOCK_TICKER];

  return (
    <div className="tm-ticker-wrap" aria-label="Live Meme Stock Market Ticker">
      <div className="tm-ticker-badge">📈 MEME NASDAQ LIVE</div>
      <div className="tm-ticker-track">
        <div className="tm-ticker-Scroll">
          {items.map((item, idx) => (
            <button
              key={`${item.symbol}-${idx}`}
              type="button"
              className="tm-ticker-item"
              onClick={() => onSelectCategory && onSelectCategory(item.category)}
            >
              <strong style={{ color: '#f8fafc' }}>{item.symbol}</strong>
              <span className={item.up ? 'tm-ticker-up' : 'tm-ticker-down'}>
                {item.up ? '▲' : '▼'} {item.delta}
              </span>
              <span style={{ color: '#94a3b8' }}>({item.label})</span>
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="tm-ticker-cta"
        onClick={onOpenRewards}
      >
        🎰 {lootSpins > 0 ? `${lootSpins} Free Spin${lootSpins > 1 ? 's' : ''}!` : 'Daily Loot'}
      </button>
    </div>
  );
}

export default function MemeSkeletonGrid({ count = 6 }) {
  return (
    <div className="tm-grid" aria-busy="true" aria-label="Loading cyber-arcade meme feed">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="tm-card tm-skeleton-card">
          <div className="tm-card-header">
            <div className="tm-skeleton-line" style={{ width: '68%', height: '18px' }} />
            <div className="tm-skeleton-pill" style={{ width: '74px', height: '22px' }} />
          </div>
          <div className="tm-skeleton-media" />
          <div className="tm-card-footer">
            <div className="tm-skeleton-line" style={{ width: '48%', height: '26px' }} />
            <div className="tm-skeleton-line" style={{ width: '100%', height: '32px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

import { Link } from 'react-router-dom';

export default function RushTank({ user }) {
  const n = user?.rushMeter ?? 0;
  const max = user?.rushMeterMax ?? 5;
  const full = n >= max;
  return (
    <Link to="/rush" className={`tank ${full ? 'full' : ''}`}>
      <span className="mono">{full ? '⚡ Rush siap' : 'Tangki rush'}</span>
      <span className="cells">
        {Array.from({ length: max }, (_, i) => (
          <i key={i} className={i < n ? 'on' : ''} />
        ))}
      </span>
      <span className="mono">{n}/{max}</span>
    </Link>
  );
}

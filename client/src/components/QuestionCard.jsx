import { API_BASE } from '../api.js';

export function resolveImageUrl(value) {
  if (!value) return value;
  return value.startsWith('/') ? `${API_BASE}${value}` : value;
}

export default function QuestionCard({ clues, shake = false, blur = 0, children }) {
  return (
    <div className={`question-card ${shake ? 'shake' : ''}`}>
      <div className="tag">TEBAK<br />GAMBAR</div>
      <div className="clues" style={blur ? { filter: `blur(${blur}px)` } : undefined}>
        {clues.map((c, i) => {
          if (c.type === 'emoji') return <span key={i} className="clue-emoji">{c.value}</span>;
          if (c.type === 'image')
            return <img key={i} className="clue-image" src={resolveImageUrl(c.value)} alt="petunjuk" />;
          return <span key={i} className="clue-text">{c.value}</span>;
        })}
      </div>
      {children}
    </div>
  );
}

import { API_BASE } from '../api.js';

export function resolveImageUrl(value) {
  if (!value) return value;
  return value.startsWith('/') ? `${API_BASE}${value}` : value;
}

export default function QuestionCard({ clues }) {
  return (
    <div className="question-card">
      {clues.map((c, i) => {
        if (c.type === 'emoji') return <span key={i} className="clue-emoji">{c.value}</span>;
        if (c.type === 'image')
          return <img key={i} className="clue-image" src={resolveImageUrl(c.value)} alt="clue" />;
        return <span key={i} className="clue-text">{c.value}</span>;
      })}
    </div>
  );
}

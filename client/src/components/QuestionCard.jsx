export default function QuestionCard({ clues }) {
  return (
    <div className="question-card">
      {clues.map((c, i) => {
        if (c.type === 'emoji') return <span key={i} className="clue-emoji">{c.value}</span>;
        if (c.type === 'image') return <img key={i} className="clue-image" src={c.value} alt="clue" />;
        return <span key={i} className="clue-text">{c.value}</span>;
      })}
    </div>
  );
}

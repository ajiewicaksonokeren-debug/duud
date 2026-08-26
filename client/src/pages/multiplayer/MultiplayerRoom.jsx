import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../hooks/useToast.js';
import Toast from '../../components/Toast.jsx';
import QuestionCard from '../../components/QuestionCard.jsx';

export default function MultiplayerRoom() {
  const { code } = useParams();
  const { socket } = useSocket();
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  const [room, setRoom] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [roundEnd, setRoundEnd] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [feed, setFeed] = useState([]);
  const tickRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const onUpdate = (r) => setRoom(r);
    const onQuestion = (q) => {
      setQuestion(q);
      setRoundEnd(null);
      setAnswer('');
      setAnswered(false);
      setFeed([]);
    };
    const onPlayerAnswered = (info) => {
      setFeed((f) => [...f, info]);
      if (info.userId === user.id) refreshMe();
    };
    const onRoundEnd = (info) => setRoundEnd(info);
    const onGameOver = (info) => {
      setGameOver(info);
      refreshMe();
    };
    const onError = (info) => showToast(info?.message || 'Terjadi kesalahan.', 'error');

    socket.on('room:update', onUpdate);
    socket.on('room:question', onQuestion);
    socket.on('room:player_answered', onPlayerAnswered);
    socket.on('room:round_end', onRoundEnd);
    socket.on('room:game_over', onGameOver);
    socket.on('room:error', onError);

    return () => {
      socket.off('room:update', onUpdate);
      socket.off('room:question', onQuestion);
      socket.off('room:player_answered', onPlayerAnswered);
      socket.off('room:round_end', onRoundEnd);
      socket.off('room:game_over', onGameOver);
      socket.off('room:error', onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user?.id]);

  useEffect(() => {
    if (!question) return;
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - question.startedAt;
      setTimeLeft(Math.max(0, question.durationMs - elapsed));
    }, 200);
    return () => clearInterval(tickRef.current);
  }, [question]);

  function leaveRoom() {
    socket?.emit('room:leave');
    navigate('/multiplayer');
  }

  function startGame() {
    socket?.emit('room:start', {}, (res) => {
      if (!res?.ok) showToast(res?.error || 'Gagal memulai.', 'error');
    });
  }

  function submitAnswer(e) {
    e.preventDefault();
    if (!answer.trim()) return;
    socket?.emit('room:answer', { answer }, (res) => {
      if (res?.correct) {
        setAnswered(true);
        showToast(`Benar! +${res.points} poin`, 'success');
      } else if (res?.ok) {
        showToast('Belum tepat!', 'error');
      }
    });
  }

  if (!room) return <div className="empty-state">Memuat room...</div>;

  const isHost = room.hostId === user.id;

  if (gameOver) {
    return (
      <div>
        <Toast toast={toast} />
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>🏆</div>
          <h2>Permainan Selesai!</h2>
          {gameOver.winner && <p>Pemenang: {gameOver.winner.username} ({gameOver.winner.score} poin)</p>}
        </div>
        <div className="section-title">Hasil Akhir</div>
        {gameOver.results.map((r, i) => (
          <div key={r.userId} className="leaderboard-row">
            <span className="rank">#{i + 1}</span>
            <span>{r.avatar}</span>
            <span className="name">{r.username}</span>
            <span style={{ fontWeight: 700 }}>{r.score} pts</span>
            <span style={{ fontSize: 11, color: 'var(--yellow)' }}>+{r.coinsAwarded}🪙</span>
          </div>
        ))}
        <button className="btn block" style={{ marginTop: 12 }} onClick={leaveRoom}>
          Kembali ke Lobby
        </button>
      </div>
    );
  }

  if (room.status === 'waiting') {
    return (
      <div>
        <Toast toast={toast} />
        <div className="room-code">{room.code}</div>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
          Bagikan kode ini ke teman untuk bergabung!
        </p>

        <div className="section-title">Pemain ({room.players.length})</div>
        {room.players.map((p) => (
          <div key={p.userId} className="player-chip">
            <span>{p.avatar}</span>
            <span>{p.username}</span>
            {room.hostId === p.userId && <span style={{ fontSize: 11, color: 'var(--yellow)' }}>HOST</span>}
          </div>
        ))}

        {isHost ? (
          <button className="btn block" style={{ marginTop: 12 }} onClick={startGame}>
            Mulai Permainan
          </button>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-dim)' }}>Menunggu host memulai permainan...</p>
        )}
        <button className="btn secondary block" style={{ marginTop: 8 }} onClick={leaveRoom}>
          Keluar Room
        </button>
      </div>
    );
  }

  const pct = question ? Math.round((timeLeft / question.durationMs) * 100) : 0;

  return (
    <div>
      <Toast toast={toast} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)' }}>
        <span>Ronde {room.currentRound}/{room.totalRounds}</span>
        <span>{Math.ceil(timeLeft / 1000)}s</span>
      </div>
      <div className="timer-bar">
        <div style={{ width: `${pct}%` }} />
      </div>

      {question && <QuestionCard clues={question.clues} />}

      {roundEnd ? (
        <div className="card" style={{ textAlign: 'center', marginTop: 12 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Jawaban: {roundEnd.answer}</p>
          <p style={{ fontSize: 12, color: '#5b7a78' }}>Ronde berikutnya sebentar lagi...</p>
        </div>
      ) : (
        <form className="answer-row" onSubmit={submitAnswer} style={{ marginTop: 12 }}>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="isi jawaban"
            disabled={answered}
            autoFocus
          />
          <button className="btn" type="submit" disabled={answered || !answer.trim()}>
            Cek
          </button>
        </form>
      )}

      <div className="section-title">Papan Skor</div>
      {[...room.players]
        .sort((a, b) => b.score - a.score)
        .map((p) => (
          <div key={p.userId} className="player-chip">
            <span>{p.avatar}</span>
            <span>{p.username}</span>
            {p.answered && <span style={{ fontSize: 11 }}>✅</span>}
            <span className="score">{p.score}</span>
          </div>
        ))}
    </div>
  );
}

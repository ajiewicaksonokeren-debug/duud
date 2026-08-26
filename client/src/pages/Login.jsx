import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.error || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div style={{ fontSize: 56, textAlign: 'center' }}>🖼️</div>
      <h1>Tebak Gambar</h1>
      <p className="subtitle">Asah otakmu, kumpulkan koin, naik level, main bareng teman!</p>

      <div className="tabs">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
          Masuk
        </button>
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
          Daftar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="masukkan username" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="masukkan password"
            required
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn block" type="submit" disabled={loading}>
          {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar & Main'}
        </button>
      </form>
      <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
        Akun demo admin: <b>admin</b> / <b>admin123</b>
      </p>
    </div>
  );
}

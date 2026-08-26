import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <div className="topbar">
        <h1>🖼️ Tebak Gambar</h1>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className="stat-pill">🪙 {user?.coins ?? 0}</span>
          <span className="stat-pill">🎟️ {user?.rouletteTickets ?? 0}</span>
          <span className="stat-pill">⭐ Lv.{user?.playerLevel ?? 1}</span>
        </div>
      </div>
      <div className="main-content">
        <Outlet />
      </div>
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon">🏠</span>
          Main
        </NavLink>
        <NavLink to="/roulette" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon">🎰</span>
          Roulette
        </NavLink>
        <NavLink to="/multiplayer" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon">🎮</span>
          Multiplayer
        </NavLink>
        <NavLink to="/kirim-soal" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon">📝</span>
          Kirim Soal
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon">👤</span>
          User
        </NavLink>
      </nav>
    </div>
  );
}

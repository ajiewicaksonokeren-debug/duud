import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', icon: '🏠', label: 'Main', end: true },
  { to: '/multiplayer', icon: '⚔️', label: 'Duel' },
  { to: '/roulette', icon: '🎡', label: 'Roulette' },
  { to: '/kirim-soal', icon: '📤', label: 'Kirim' },
  { to: '/profile', icon: '👤', label: 'Profil' },
];

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <div className="topbar">
        <Link to="/" className="brand">
          TEBAK<br />
          <span>GAMBAR</span>
        </Link>
        <div className="stats">
          <span className="stat-pill coin">🪙 {(user?.coins ?? 0).toLocaleString('id-ID')}</span>
          <span className="stat-pill">{user?.rouletteTickets ?? 0}T</span>
          <span className="stat-pill lv">LV{user?.playerLevel ?? 1}</span>
        </div>
      </div>
      <div className="main-content">
        <Outlet />
      </div>
      <nav className="bottom-nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="icon">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

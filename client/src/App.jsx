import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Game from './pages/Game.jsx';
import Profile from './pages/Profile.jsx';
import SubmitQuestion from './pages/SubmitQuestion.jsx';
import Roulette from './pages/Roulette.jsx';
import Articles from './pages/Articles.jsx';
import ArticleDetail from './pages/ArticleDetail.jsx';
import TebakSkor from './pages/TebakSkor.jsx';
import ClaimPublic from './pages/ClaimPublic.jsx';
import Admin from './pages/admin/Admin.jsx';
import MultiplayerLobby from './pages/multiplayer/MultiplayerLobby.jsx';
import MultiplayerRoom from './pages/multiplayer/MultiplayerRoom.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="empty-state">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Public claim page opened via in-app browser (Custom Tabs), no login required. */}
      <Route path="/rewards/id/:token" element={<ClaimPublic />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Home />} />
        <Route path="category/:categoryId" element={<Game />} />
        <Route path="roulette" element={<Roulette />} />
        <Route path="artikel" element={<Articles />} />
        <Route path="artikel/:id" element={<ArticleDetail />} />
        <Route path="tebak-skor" element={<TebakSkor />} />
        <Route path="multiplayer" element={<MultiplayerLobby />} />
        <Route path="multiplayer/:code" element={<MultiplayerRoom />} />
        <Route path="kirim-soal" element={<SubmitQuestion />} />
        <Route path="profile" element={<Profile />} />
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

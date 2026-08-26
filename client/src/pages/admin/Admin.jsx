import { useState } from 'react';
import AdminPacks from './AdminPacks.jsx';
import AdminQuestions from './AdminQuestions.jsx';
import AdminSubmitted from './AdminSubmitted.jsx';
import Toast from '../../components/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';

export default function Admin() {
  const [tab, setTab] = useState('packs');
  const { toast, showToast } = useToast();

  return (
    <div>
      <Toast toast={toast} />
      <div className="section-title">Panel Admin</div>
      <div className="tabs">
        <button className={tab === 'packs' ? 'active' : ''} onClick={() => setTab('packs')}>
          Level/Pack
        </button>
        <button className={tab === 'questions' ? 'active' : ''} onClick={() => setTab('questions')}>
          Soal
        </button>
        <button className={tab === 'submitted' ? 'active' : ''} onClick={() => setTab('submitted')}>
          Kiriman User
        </button>
      </div>

      {tab === 'packs' && <AdminPacks showToast={showToast} />}
      {tab === 'questions' && <AdminQuestions showToast={showToast} />}
      {tab === 'submitted' && <AdminSubmitted showToast={showToast} />}
    </div>
  );
}

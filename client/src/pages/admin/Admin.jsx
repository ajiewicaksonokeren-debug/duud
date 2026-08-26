import { useState } from 'react';
import AdminCategories from './AdminCategories.jsx';
import AdminQuestions from './AdminQuestions.jsx';
import AdminBulkImport from './AdminBulkImport.jsx';
import AdminSubmitted from './AdminSubmitted.jsx';
import AdminRoulette from './AdminRoulette.jsx';
import AdminClaims from './AdminClaims.jsx';
import AdminArticles from './AdminArticles.jsx';
import AdminEsports from './AdminEsports.jsx';
import Toast from '../../components/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';

const TABS = [
  { key: 'categories', label: 'Kategori' },
  { key: 'questions', label: 'Soal' },
  { key: 'bulk', label: 'Import Massal' },
  { key: 'submitted', label: 'Kiriman User' },
  { key: 'articles', label: 'Artikel' },
  { key: 'esports', label: 'Tebak Skor' },
  { key: 'roulette', label: 'Roulette' },
  { key: 'claims', label: 'Klaim Hadiah' },
];

export default function Admin() {
  const [tab, setTab] = useState('categories');
  const { toast, showToast } = useToast();

  return (
    <div>
      <Toast toast={toast} />
      <div className="section-title">Panel Admin</div>
      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)} style={{ flex: '1 1 30%' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'categories' && <AdminCategories showToast={showToast} />}
      {tab === 'questions' && <AdminQuestions showToast={showToast} />}
      {tab === 'bulk' && <AdminBulkImport showToast={showToast} />}
      {tab === 'submitted' && <AdminSubmitted showToast={showToast} />}
      {tab === 'articles' && <AdminArticles showToast={showToast} />}
      {tab === 'esports' && <AdminEsports showToast={showToast} />}
      {tab === 'roulette' && <AdminRoulette showToast={showToast} />}
      {tab === 'claims' && <AdminClaims />}
    </div>
  );
}

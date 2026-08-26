import { useRef, useState } from 'react';
import api from '../api.js';
import { resolveImageUrl } from './QuestionCard.jsx';

export default function ClueEditor({ clues, onChange }) {
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const fileInputRef = useRef(null);
  const targetIndexRef = useRef(null);

  function updateClue(i, patch) {
    onChange(clues.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function addClue() {
    onChange([...clues, { type: 'emoji', value: '' }]);
  }

  function removeClue(i) {
    onChange(clues.filter((_, idx) => idx !== i));
  }

  function triggerUpload(i) {
    targetIndexRef.current = i;
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const i = targetIndexRef.current;
    setUploadingIndex(i);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/uploads', formData);
      updateClue(i, { value: data.url });
    } catch (err) {
      alert(err?.response?.data?.error || 'Gagal upload gambar.');
    } finally {
      setUploadingIndex(null);
    }
  }

  return (
    <div>
      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelected} />
      {clues.map((c, i) => (
        <div key={i} className="clue-editor-row" style={{ alignItems: 'flex-start' }}>
          <select value={c.type} onChange={(e) => updateClue(i, { type: e.target.value, value: '' })}>
            <option value="emoji">Emoji</option>
            <option value="text">Huruf</option>
            <option value="image">Gambar</option>
          </select>

          {c.type === 'image' ? (
            <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
              {c.value && <img src={resolveImageUrl(c.value)} alt="" style={{ height: 36, borderRadius: 6 }} />}
              <button
                type="button"
                className="btn secondary"
                style={{ padding: '8px 10px', fontSize: 12 }}
                onClick={() => triggerUpload(i)}
                disabled={uploadingIndex === i}
              >
                {uploadingIndex === i ? 'Uploading...' : c.value ? 'Ganti Gambar' : 'Upload Gambar'}
              </button>
            </div>
          ) : (
            <input value={c.value} onChange={(e) => updateClue(i, { value: e.target.value })} required />
          )}

          {clues.length > 1 && (
            <button type="button" className="btn danger" style={{ padding: '10px 12px' }} onClick={() => removeClue(i)}>
              ✕
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn secondary block" style={{ marginBottom: 12 }} onClick={addClue}>
        + Tambah Clue
      </button>
    </div>
  );
}

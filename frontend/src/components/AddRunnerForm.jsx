import { useState } from 'react';
import { addTrackedRunner } from '../api.js';

export default function AddRunnerForm({ onAdded }) {
  const [bib, setBib] = useState('');
  const [status, setStatus] = useState({ state: 'idle' }); // idle | loading | error | success

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = bib.trim();
    if (!trimmed) return;
    setStatus({ state: 'loading' });
    try {
      const result = await addTrackedRunner(trimmed);
      setStatus({ state: 'success', message: `${result.name || trimmed}님 추가됨` });
      setBib('');
      onAdded?.();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  return (
    <form className="add-runner-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="배번호 입력 (예: 18915)"
        value={bib}
        onChange={(e) => setBib(e.target.value)}
        disabled={status.state === 'loading'}
      />
      <button type="submit" disabled={status.state === 'loading' || !bib.trim()}>
        {status.state === 'loading' ? '조회 중...' : '추가'}
      </button>
      {status.state === 'error' && <span className="add-runner-message error">{status.message}</span>}
      {status.state === 'success' && <span className="add-runner-message success">{status.message}</span>}
    </form>
  );
}

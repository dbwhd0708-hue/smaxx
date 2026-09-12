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
    } catch (err) {
      setStatus({
        state: 'error',
        message: `${err.message} (서버에는 이미 반영됐을 수 있어요 — 아래 목록을 확인해주세요)`,
      });
    } finally {
      // Refresh regardless of what the response said: on a flaky real-network
      // request the write can land on the server even if this response
      // errors out client-side, so the runner list is the source of truth.
      onAdded?.();
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

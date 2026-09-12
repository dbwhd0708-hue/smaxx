export async function fetchCourse() {
  const res = await fetch('/api/course');
  if (!res.ok) throw new Error('failed to load course');
  return res.json();
}

export async function fetchRunners() {
  const res = await fetch('/api/runners');
  if (!res.ok) throw new Error('failed to load runners');
  return res.json();
}

export async function fetchTrackedRunners() {
  const res = await fetch('/api/tracked-runners');
  if (!res.ok) throw new Error('failed to load tracked runners');
  return res.json();
}

export async function addTrackedRunner(bib) {
  const res = await fetch('/api/tracked-runners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bib }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '추가에 실패했습니다.');
  return data;
}

export async function removeTrackedRunner(bib) {
  const res = await fetch(`/api/tracked-runners/${encodeURIComponent(bib)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '삭제에 실패했습니다.');
  }
}

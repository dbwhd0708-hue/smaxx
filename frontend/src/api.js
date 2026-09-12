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

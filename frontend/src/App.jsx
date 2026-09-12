import { useEffect, useState } from 'react';
import MarathonMap from './components/MarathonMap.jsx';
import RunnerList from './components/RunnerList.jsx';
import { fetchCourse, fetchRunners } from './api.js';

const POLL_INTERVAL_MS = 5000;

export default function App() {
  const [course, setCourse] = useState(null);
  const [snapshot, setSnapshot] = useState({ runners: [] });
  const [selectedBib, setSelectedBib] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCourse().then(setCourse).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const data = await fetchRunners();
        if (!cancelled) {
          setSnapshot(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>{course?.properties?.name || '마라톤 주자 트래킹'}</h1>
        <div className="app-header-meta">
          {snapshot.dataSource && <span className="badge">데이터 소스: {snapshot.dataSource}</span>}
          {snapshot.lastPolledAt && (
            <span>업데이트: {new Date(snapshot.lastPolledAt).toLocaleTimeString('ko-KR')}</span>
          )}
          {error && <span className="badge badge-error">연결 오류: {error}</span>}
        </div>
      </header>

      <div className="app-map">
        <MarathonMap
          course={course}
          runners={snapshot.runners}
          selectedBib={selectedBib}
          onSelectRunner={setSelectedBib}
        />
      </div>

      <div className="app-body">
        <RunnerList
          runners={snapshot.runners}
          selectedBib={selectedBib}
          onSelectRunner={setSelectedBib}
        />
      </div>
    </div>
  );
}

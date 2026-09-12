import { useEffect, useState } from 'react';
import MarathonMap from './components/MarathonMap.jsx';
import RunnerList from './components/RunnerList.jsx';
import AddRunnerForm from './components/AddRunnerForm.jsx';
import { fetchCourse, fetchRunners, removeTrackedRunner } from './api.js';

const POLL_INTERVAL_MS = 5000;

export default function App() {
  const [course, setCourse] = useState(null);
  const [snapshot, setSnapshot] = useState({ runners: [] });
  const [selectedBib, setSelectedBib] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCourse().then(setCourse).catch((e) => setError(e.message));
  }, []);

  async function refresh() {
    try {
      const data = await fetchRunners();
      setSnapshot(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  async function handleRemoveRunner(bib) {
    try {
      await removeTrackedRunner(bib);
      if (selectedBib === bib) setSelectedBib(null);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

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
        <AddRunnerForm onAdded={refresh} />
        <RunnerList
          runners={snapshot.runners}
          selectedBib={selectedBib}
          onSelectRunner={setSelectedBib}
          onRemoveRunner={handleRemoveRunner}
        />
      </div>
    </div>
  );
}

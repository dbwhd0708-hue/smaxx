const STATUS_LABEL = {
  not_started: '출발 전',
  running: '레이스 중',
  finished: '완주',
};

function formatPace(paceMinPerKm) {
  if (!paceMinPerKm) return '-';
  const min = Math.floor(paceMinPerKm);
  const sec = Math.round((paceMinPerKm - min) * 60);
  return `${min}'${String(sec).padStart(2, '0')}"/km`;
}

export default function RunnerList({ runners, selectedBib, onSelectRunner, onRemoveRunner }) {
  const sorted = [...runners].sort((a, b) => b.estimatedDistanceKm - a.estimatedDistanceKm);

  return (
    <div className="runner-list">
      <div className="runner-list-header">
        <span>주자 ({runners.length})</span>
      </div>
      <ul>
        {sorted.map((runner) => (
          <li
            key={runner.bib}
            className={runner.bib === selectedBib ? 'selected' : ''}
            onClick={() => onSelectRunner?.(runner.bib)}
          >
            <div className="runner-row-top">
              <span className={`status-dot status-${runner.status}`} />
              <span className="runner-name">{runner.name}</span>
              <span className="runner-bib">#{runner.bib}</span>
              {onRemoveRunner && (
                <button
                  type="button"
                  className="runner-remove-btn"
                  title="추적 중단"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRunner(runner.bib);
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <div className="runner-row-bottom">
              <span>{STATUS_LABEL[runner.status]}</span>
              <span>{runner.estimatedDistanceKm?.toFixed(1)} km</span>
              <span>{formatPace(runner.paceMinPerKm)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

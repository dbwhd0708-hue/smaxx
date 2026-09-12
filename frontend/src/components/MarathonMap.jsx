import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';

const STATUS_COLOR = {
  not_started: '#9ca3af',
  running: '#2563eb',
  finished: '#16a34a',
};

// When several runners land on (almost) the same spot on the course, spread
// them around a small circle so every marker + name stays visible instead of
// stacking into one. ~0.00015deg latitude is roughly 15-17m on the ground —
// enough to separate markers visually without misrepresenting position.
function spreadOverlappingRunners(runners) {
  const groups = new Map();
  for (const r of runners) {
    if (r.lat == null || r.lng == null) continue;
    const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const OFFSET_DEG = 0.00015;
  const spread = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      spread.push(group[0]);
      continue;
    }
    const latRad = (group[0].lat * Math.PI) / 180;
    group.forEach((r, i) => {
      const angle = (2 * Math.PI * i) / group.length;
      spread.push({
        ...r,
        lat: r.lat + OFFSET_DEG * Math.sin(angle),
        lng: r.lng + (OFFSET_DEG * Math.cos(angle)) / Math.cos(latRad),
      });
    });
  }
  return spread;
}

function FitBoundsOnce({ positions }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current && positions.length > 0) {
      map.fitBounds(positions, { padding: [24, 24] });
      fitted.current = true;
    }
  }, [positions, map]);
  return null;
}

export default function MarathonMap({ course, runners, selectedBib, onSelectRunner }) {
  const coursePositions = useMemo(
    () => (course ? course.geometry.coordinates.map(([lng, lat]) => [lat, lng]) : []),
    [course]
  );
  const courseColor = course?.properties?.color || '#e11d48';
  const visibleRunners = useMemo(
    () => spreadOverlappingRunners(runners.filter((r) => r.status !== 'not_started' && r.lat != null)),
    [runners]
  );

  return (
    <MapContainer
      center={[37.5445, 127.0]}
      zoom={12}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {coursePositions.length > 0 && (
        <>
          <Polyline
            positions={coursePositions}
            pathOptions={{ color: courseColor, weight: 6, opacity: 0.85 }}
          />
          <FitBoundsOnce positions={coursePositions} />
        </>
      )}

      {visibleRunners.map((runner) => {
        const isSelected = runner.bib === selectedBib;
        return (
          <CircleMarker
            key={runner.bib}
            center={[runner.lat, runner.lng]}
            radius={isSelected ? 9 : 6}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: STATUS_COLOR[runner.status] || STATUS_COLOR.running,
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onSelectRunner?.(runner.bib) }}
          >
            <Tooltip permanent direction="top" offset={[0, -6]} className="runner-label">
              {runner.name}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

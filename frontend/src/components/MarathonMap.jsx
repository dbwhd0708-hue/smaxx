import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';

const STATUS_COLOR = {
  not_started: '#9ca3af',
  running: '#2563eb',
  finished: '#16a34a',
};

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

      {runners.map((runner) => {
        if (runner.status === 'not_started' || runner.lat == null) return null;
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

const fs = require('fs');
const path = require('path');

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm([lng1, lat1], [lng2, lat2]) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Loads a course GeoJSON and precomputes cumulative distance at each vertex,
 * scaled so the last vertex lands exactly on the course's official distance
 * (straight lines between hand-picked waypoints are shorter than the real
 * road, so raw haversine distance is stretched to match the real total).
 */
function loadCourse(geojsonPath) {
  const raw = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));
  const coords = raw.geometry.coordinates; // [lng, lat][]
  const officialDistanceKm = raw.properties.distanceKm;

  const rawCumulative = [0];
  for (let i = 1; i < coords.length; i++) {
    rawCumulative.push(rawCumulative[i - 1] + haversineKm(coords[i - 1], coords[i]));
  }
  const rawTotal = rawCumulative[rawCumulative.length - 1];
  const scale = rawTotal > 0 ? officialDistanceKm / rawTotal : 1;
  const cumulativeKm = rawCumulative.map((d) => d * scale);

  function getPointAtDistance(km) {
    const clamped = Math.max(0, Math.min(km, officialDistanceKm));
    let segIndex = 0;
    while (
      segIndex < cumulativeKm.length - 2 &&
      cumulativeKm[segIndex + 1] < clamped
    ) {
      segIndex++;
    }
    const segStart = cumulativeKm[segIndex];
    const segEnd = cumulativeKm[segIndex + 1];
    const t = segEnd > segStart ? (clamped - segStart) / (segEnd - segStart) : 0;
    const [lng1, lat1] = coords[segIndex];
    const [lng2, lat2] = coords[segIndex + 1];
    return {
      lat: lat1 + (lat2 - lat1) * t,
      lng: lng1 + (lng2 - lng1) * t,
    };
  }

  return {
    id: raw.properties.id,
    name: raw.properties.name,
    color: raw.properties.color || '#e11d48',
    note: raw.properties.note,
    distanceKm: officialDistanceKm,
    waypoints: raw.properties.waypoints || [],
    coordinates: coords,
    getPointAtDistance,
    toGeoJSON: () => raw,
  };
}

const defaultCourse = loadCourse(path.join(__dirname, 'data', 'course-full.geojson'));

module.exports = { loadCourse, haversineKm, defaultCourse };

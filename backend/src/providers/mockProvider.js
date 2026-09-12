// Mock data source: simulates runners progressing along the course so the
// app is fully demoable without any real smartchip access. Shaped exactly
// like the real provider's output so trackingService.js can't tell them apart.

const CHECKPOINTS_KM = [0, 5, 10, 15, 20, 21.0975, 25, 30, 35, 40, 42.195];

const SAMPLE_NAMES = [
  '김민준', '이서연', '박도윤', '최지우', '정하준', '강서윤', '조은우', '윤아린',
  '장시우', '임채원', '한지호', '오서준', '신유나', '권도현', '황수아', '문예준',
  '양지안', '배소율', '송태윤', '홍민서',
];

function createRunners(count) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const paceMinPerKm = 4.5 + Math.random() * 2.5; // 4:30 ~ 7:00 /km
    const totalDurationMin = paceMinPerKm * 42.195;
    // Spread runners across the whole race: some near the start, some
    // finishing, so the map looks alive as soon as the server boots.
    const progressFraction = Math.random();
    const virtualStartMs = now - progressFraction * totalDurationMin * 60 * 1000;
    return {
      bib: String(10001 + i),
      name: SAMPLE_NAMES[i % SAMPLE_NAMES.length],
      paceMinPerKm,
      virtualStartMs,
    };
  });
}

let runners = null;

function getRunners(count) {
  if (!runners) runners = createRunners(count);
  return runners;
}

/**
 * Returns the same shape a real provider must return:
 * [{ bib, name, records: [{ km, time }] }]
 * `records` only includes checkpoints already "tagged" as of `now`.
 */
async function fetchCheckpointRecords({ now = new Date(), runnerCount = 24 } = {}) {
  const nowMs = now.getTime();
  return getRunners(runnerCount).map((runner) => {
    const elapsedMin = (nowMs - runner.virtualStartMs) / 60000;
    const distanceKm = Math.max(0, elapsedMin / runner.paceMinPerKm);
    const records = CHECKPOINTS_KM.filter((km) => km <= distanceKm).map((km) => ({
      km,
      time: new Date(runner.virtualStartMs + km * runner.paceMinPerKm * 60000).toISOString(),
    }));
    return { bib: runner.bib, name: runner.name, records };
  });
}

module.exports = { fetchCheckpointRecords, CHECKPOINTS_KM };

require('dotenv').config();

function parseJsonEnv(name) {
  const raw = process.env[name];
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn(`[config] ${name} is not valid JSON, ignoring`);
    return undefined;
  }
}

const dataSource = process.env.DATA_SOURCE === 'smartchip' ? 'smartchip' : 'mock';

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  refreshIntervalMs: parseInt(process.env.REFRESH_INTERVAL_MS || '15000', 10),
  dataSource,
  mock: {
    runnerCount: parseInt(process.env.MOCK_RUNNER_COUNT || '24', 10),
  },
  smartchip: {
    urlTemplate: process.env.SMARTCHIP_URL_TEMPLATE || '',
    // Comma-separated "bib:name" pairs, e.g. "10321:홍길동,10322:김철수"
    trackedRunners: (process.env.SMARTCHIP_BIBS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((entry) => {
        const [bib, name] = entry.split(':');
        return { bib: bib.trim(), name: name?.trim() };
      }),
    selectors: parseJsonEnv('SMARTCHIP_SELECTORS'),
    requestDelayMs: parseInt(process.env.SMARTCHIP_REQUEST_DELAY_MS || '1500', 10),
  },
  // Default pace (min/km) assumed for a runner who has only tagged the start
  // checkpoint, until a second tag lets us compute a real pace.
  assumedStartPaceMinPerKm: parseFloat(process.env.ASSUMED_START_PACE_MIN_PER_KM || '6'),
};

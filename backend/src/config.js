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

function parseBibList(raw) {
  return (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [bib, name] = entry.split(':');
      return { bib: bib.trim(), name: name?.trim() };
    });
}

const VALID_SOURCES = ['mock', 'smartchip', 'myresult'];
const dataSource = VALID_SOURCES.includes(process.env.DATA_SOURCE) ? process.env.DATA_SOURCE : 'mock';

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  refreshIntervalMs: parseInt(process.env.REFRESH_INTERVAL_MS || '30000', 10),
  dataSource,
  mock: {
    runnerCount: parseInt(process.env.MOCK_RUNNER_COUNT || '24', 10),
  },
  smartchip: {
    urlTemplate: process.env.SMARTCHIP_URL_TEMPLATE || '',
    trackedRunners: parseBibList(process.env.SMARTCHIP_BIBS),
    selectors: parseJsonEnv('SMARTCHIP_SELECTORS'),
    requestDelayMs: parseInt(process.env.SMARTCHIP_REQUEST_DELAY_MS || '1500', 10),
  },
  myresult: {
    eventId: process.env.MYRESULT_EVENT_ID || '',
    baseUrl: process.env.MYRESULT_BASE_URL || 'https://www.myresult.co.kr',
    // Comma-separated "bib:name" pairs, e.g. "18915:최유종,20001:홍길동"
    trackedRunners: parseBibList(process.env.MYRESULT_BIBS),
    requestDelayMs: parseInt(process.env.MYRESULT_REQUEST_DELAY_MS || '800', 10),
  },
  // Default pace (min/km) assumed for a runner who has only tagged the start
  // checkpoint, until a second tag lets us compute a real pace.
  assumedStartPaceMinPerKm: parseFloat(process.env.ASSUMED_START_PACE_MIN_PER_KM || '6'),
};

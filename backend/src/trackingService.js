const config = require('./config');
const { defaultCourse } = require('./course');
const mockProvider = require('./providers/mockProvider');
const smartchipProvider = require('./providers/smartchipProvider');
const myresultProvider = require('./providers/myresultProvider');
const trackedRunnersStore = require('./trackedRunnersStore');

const runnerState = new Map(); // bib -> { bib, name, records: [{km, time}] }
let lastPolledAt = null;
let lastError = null;
let timer = null;

function mergeRecords(existing, incoming) {
  const byKm = new Map((existing || []).map((r) => [r.km, r]));
  for (const r of incoming) byKm.set(r.km, r);
  return Array.from(byKm.values()).sort((a, b) => a.km - b.km);
}

async function pollOnce() {
  try {
    const trackedRunners = trackedRunnersStore.list();

    let raw;
    if (config.dataSource === 'smartchip') {
      raw = await smartchipProvider.fetchCheckpointRecords({
        trackedRunners,
        urlTemplate: config.smartchip.urlTemplate,
        selectors: config.smartchip.selectors,
        requestDelayMs: config.smartchip.requestDelayMs,
      });
    } else if (config.dataSource === 'myresult') {
      raw = await myresultProvider.fetchCheckpointRecords({
        eventId: config.myresult.eventId,
        baseUrl: config.myresult.baseUrl,
        trackedRunners,
        requestDelayMs: config.myresult.requestDelayMs,
      });
    } else {
      raw = await mockProvider.fetchCheckpointRecords({ runnerCount: config.mock.runnerCount });
    }

    for (const runner of raw) {
      const prev = runnerState.get(runner.bib);
      runnerState.set(runner.bib, {
        bib: runner.bib,
        name: runner.name,
        records: mergeRecords(prev?.records, runner.records || []),
      });
    }
    lastPolledAt = new Date();
    lastError = null;
  } catch (err) {
    lastError = err.message;
    console.error('[trackingService] poll failed:', err.message);
  }
}

/** Estimates where a runner is right now, given the checkpoints tagged so far. */
function estimatePosition(runner, now = new Date()) {
  const records = runner.records;
  if (!records || records.length === 0) {
    return { status: 'not_started', estimatedDistanceKm: 0, paceMinPerKm: null };
  }

  const last = records[records.length - 1];
  const lastTimeMs = new Date(last.time).getTime();

  if (last.km >= defaultCourse.distanceKm - 1e-6) {
    return {
      status: 'finished',
      estimatedDistanceKm: defaultCourse.distanceKm,
      paceMinPerKm: records.length >= 2 ? paceBetween(records[records.length - 2], last) : null,
      lastCheckpointKm: last.km,
      lastCheckpointTime: last.time,
    };
  }

  const pace =
    records.length >= 2
      ? paceBetween(records[records.length - 2], last)
      : config.assumedStartPaceMinPerKm;

  const elapsedMin = Math.max(0, (now.getTime() - lastTimeMs) / 60000);
  const estimatedDistanceKm = Math.min(
    defaultCourse.distanceKm,
    last.km + elapsedMin / pace
  );

  return {
    status: 'running',
    estimatedDistanceKm,
    paceMinPerKm: pace,
    lastCheckpointKm: last.km,
    lastCheckpointTime: last.time,
  };
}

function paceBetween(a, b) {
  const dtMin = (new Date(b.time).getTime() - new Date(a.time).getTime()) / 60000;
  const dKm = b.km - a.km;
  return dKm > 0 ? dtMin / dKm : config.assumedStartPaceMinPerKm;
}

function getSnapshot() {
  const now = new Date();
  const runners = Array.from(runnerState.values()).map((runner) => {
    const est = estimatePosition(runner, now);
    const { lat, lng } = defaultCourse.getPointAtDistance(est.estimatedDistanceKm);
    return { bib: runner.bib, name: runner.name, ...est, lat, lng };
  });
  return {
    runners,
    lastPolledAt,
    lastError,
    dataSource: config.dataSource,
  };
}

function getHistory(bib) {
  return runnerState.get(bib) || null;
}

function removeRunner(bib) {
  runnerState.delete(bib);
}

function start() {
  pollOnce();
  timer = setInterval(pollOnce, config.refreshIntervalMs);
}

function stop() {
  if (timer) clearInterval(timer);
}

module.exports = { start, stop, getSnapshot, getHistory, pollOnce, removeRunner };

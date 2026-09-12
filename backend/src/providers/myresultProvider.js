// Real data source for myresult.co.kr (used by e.g. the JTBC Seoul Marathon
// results site). Verified against the live JSON API on 2026-09-12 using a
// real 2024 JTBC Seoul Marathon record:
//   GET https://www.myresult.co.kr/api/event/{eventId}/player/{bib}
//
// The response's `course.path` / `course.points[].lat/lng` fields look like
// unrelated placeholder data (some points sit at latitude ~33.5, which is
// Jeju-do, not Seoul; the rest cluster inside a ~2km box, far short of a
// 42.195km course) — so this provider deliberately ignores those and only
// pulls the km distance + tag time out of `records[]`. The map's course
// shape comes from course.js / course-full.geojson instead; this provider
// only supplies "how far has this runner gone, and when did we last hear
// from them".

const KST_OFFSET = '+09:00'; // myresult times are Korea local time, no zone in the payload

function buildIsoTime(eventDateStr, timePointStr) {
  if (!eventDateStr || !timePointStr) return null;
  const d = new Date(`${eventDateStr}T${timePointStr}${KST_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function fetchRunnerJson(baseUrl, eventId, bib, timeoutMs = 10000) {
  const url = `${baseUrl}/api/event/${eventId}/player/${bib}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`${timeoutMs}ms 안에 응답이 없어 요청을 중단했습니다 (${url})`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function parsePlayerJson(data) {
  const eventDate = data.event?.date;
  const records = (data.records || [])
    .map((r) => ({
      km: parseFloat(r.point?.distance),
      time: buildIsoTime(eventDate, r.time_point),
      label: r.point?.name,
    }))
    .filter((r) => Number.isFinite(r.km) && r.time)
    .sort((a, b) => a.km - b.km);
  return { name: data.name, records };
}

/**
 * @param {object} opts
 * @param {string} opts.eventId myresult event id, e.g. "92" (2024) — check the
 *   event's own overview page URL (myresult.co.kr/{eventId}) for the current race
 * @param {{bib:string,name?:string}[]} opts.trackedRunners
 * @param {string} [opts.baseUrl]
 * @param {number} [opts.requestDelayMs] delay between per-runner requests
 */
async function fetchCheckpointRecords({
  eventId,
  trackedRunners,
  baseUrl = 'https://www.myresult.co.kr',
  requestDelayMs = 800,
}) {
  if (!eventId) throw new Error('myresultProvider requires config.eventId');
  if (!trackedRunners || trackedRunners.length === 0) return [];

  const results = [];
  for (const runner of trackedRunners) {
    try {
      const data = await fetchRunnerJson(baseUrl, eventId, runner.bib);
      const { name, records } = parsePlayerJson(data);
      results.push({ bib: runner.bib, name: name || runner.name || runner.bib, records });
    } catch (err) {
      results.push({ bib: runner.bib, name: runner.name || runner.bib, records: [], error: err.message });
    }
    if (requestDelayMs) await new Promise((r) => setTimeout(r, requestDelayMs));
  }
  return results;
}

/**
 * Verifies a bib actually exists (as opposed to just "has no checkpoints
 * yet", which is normal for someone who hasn't started the race). A bib
 * with zero records but a real name attached is still a valid runner.
 */
async function lookupRunner({ eventId, bib, baseUrl = 'https://www.myresult.co.kr' }) {
  try {
    const data = await fetchRunnerJson(baseUrl, eventId, bib);
    if (!data || !data.name) return { found: false };
    const { name, records } = parsePlayerJson(data);
    return { found: true, name, records };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

module.exports = { fetchCheckpointRecords, parsePlayerJson, buildIsoTime, lookupRunner };

// Real data source: fetches per-runner checkpoint (km split) records from a
// race-timing result page (e.g. smartchip.co.kr / myresult.co.kr) and parses
// them into the same shape mockProvider produces:
//   [{ bib, name, records: [{ km, time }] }]
//
// IMPORTANT — this could not be tested against the live site from the
// environment this was built in (outbound network access to smartchip.co.kr
// and myresult.co.kr was blocked there), so treat this as a best-effort
// starting point, not a verified integration. Before relying on it:
//   1. Open a real result page for a bib number in your browser, inspect the
//      checkpoint table with devtools, and check whether the generic parser
//      below (`parseCheckpointTableHeuristic`) finds it — enable DEBUG_HTML
//      to dump the fetched HTML and compare.
//   2. If it doesn't, set SMARTCHIP_SELECTORS (see .env.example) to exact
//      CSS selectors for the row / km-label / time-value cells and the
//      override path in `parseCheckpointTable` will be used instead.
//   3. Some result sites require a bib + a name or birthdate to search
//      (privacy protection) — add those fields to config.runnerQuery.

const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const TIME_RE = /\b(\d{1,2}):(\d{2}):(\d{2})\b/; // HH:MM:SS split/finish time
const KM_RE = /(\d+(?:\.\d+)?)\s*km/i;

function buildUrl(template, runner) {
  return template
    .replace('{bib}', encodeURIComponent(runner.bib))
    .replace('{name}', encodeURIComponent(runner.name || ''))
    .replace('{birth}', encodeURIComponent(runner.birth || ''));
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  if (process.env.DEBUG_HTML) {
    const dir = path.join(__dirname, '..', '..', '.debug-html');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${Date.now()}.html`), html);
  }
  return html;
}

/**
 * Heuristic parser: works when the result table has a header row of km
 * markers ("5km", "10km", ... or "5.0km") and, somewhere below each header
 * cell (same column, a following row), a cell containing an HH:MM:SS time.
 * This covers the common "split table" layout most Korean timing sites use
 * without needing to know their exact class names ahead of time.
 */
function parseCheckpointTableHeuristic($) {
  const records = [];

  $('table').each((_, table) => {
    const $table = $(table);
    const rows = $table.find('tr').toArray();
    if (rows.length < 2) return;

    // Find a header-ish row whose cells mention "Nkm".
    let headerRowIdx = -1;
    let kmByCol = {};
    rows.forEach((row, idx) => {
      const cells = $(row).find('th,td').toArray();
      const found = {};
      cells.forEach((cell, col) => {
        const text = $(cell).text().trim();
        const m = text.match(KM_RE);
        if (m) found[col] = parseFloat(m[1]);
      });
      if (Object.keys(found).length >= 2 && Object.keys(found).length > Object.keys(kmByCol).length) {
        headerRowIdx = idx;
        kmByCol = found;
      }
    });
    if (headerRowIdx === -1) return;

    // Scan subsequent rows for time values under those columns.
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const cells = $(rows[i]).find('th,td').toArray();
      cells.forEach((cell, col) => {
        if (!(col in kmByCol)) return;
        const text = $(cell).text().trim();
        const m = text.match(TIME_RE);
        if (m) records.push({ km: kmByCol[col], time: m[0] });
      });
    }
  });

  // De-dupe by km, keep first occurrence.
  const seen = new Set();
  return records.filter((r) => {
    if (seen.has(r.km)) return false;
    seen.add(r.km);
    return true;
  });
}

/** Override path: exact selectors supplied via config/env. */
function parseCheckpointTableWithSelectors($, selectors) {
  const records = [];
  $(selectors.row).each((_, row) => {
    const $row = $(row);
    const kmText = $row.find(selectors.km).text().trim();
    const timeText = $row.find(selectors.time).text().trim();
    const kmMatch = kmText.match(/(\d+(?:\.\d+)?)/);
    const timeMatch = timeText.match(TIME_RE);
    if (kmMatch && timeMatch) {
      records.push({ km: parseFloat(kmMatch[1]), time: timeMatch[0] });
    }
  });
  return records;
}

function parseCheckpointTable(html, selectors) {
  const $ = cheerio.load(html);
  const records = selectors
    ? parseCheckpointTableWithSelectors($, selectors)
    : parseCheckpointTableHeuristic($);
  records.sort((a, b) => a.km - b.km);
  return records;
}

/**
 * @param {object} opts
 * @param {{bib:string,name?:string,birth?:string}[]} opts.trackedRunners bibs to poll
 * @param {string} opts.urlTemplate e.g. "https://smartchip.co.kr/Search_Ballyno.html?usedata={bib}"
 * @param {object} [opts.selectors] optional exact-selector override, see module docs
 * @param {number} [opts.requestDelayMs] delay between requests to be polite to the target site
 */
async function fetchCheckpointRecords({ trackedRunners, urlTemplate, selectors, requestDelayMs = 1500 }) {
  if (!urlTemplate) throw new Error('smartchipProvider requires config.urlTemplate');
  if (!trackedRunners || trackedRunners.length === 0) return [];

  const results = [];
  for (const runner of trackedRunners) {
    const url = buildUrl(urlTemplate, runner);
    try {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      const records = parseCheckpointTable(html, selectors);
      const name = runner.name || $(selectors?.name || '.runner-name, .name').first().text().trim() || runner.bib;
      results.push({ bib: runner.bib, name, records });
    } catch (err) {
      results.push({ bib: runner.bib, name: runner.name || runner.bib, records: [], error: err.message });
    }
    if (requestDelayMs) await new Promise((r) => setTimeout(r, requestDelayMs));
  }
  return results;
}

module.exports = { fetchCheckpointRecords, parseCheckpointTable, parseCheckpointTableHeuristic };

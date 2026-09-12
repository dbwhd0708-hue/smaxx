// Persists the list of runners the user has chosen to track (added via the
// frontend "add by bib" form) so it survives server restarts, without
// requiring anyone to edit .env by hand.

const fs = require('fs');
const path = require('path');
const config = require('./config');

const STORE_PATH = path.join(__dirname, '..', 'data', 'tracked-runners.json');

function seedFromConfig() {
  const seen = new Set();
  const seeded = [];
  for (const r of [...config.myresult.trackedRunners, ...config.smartchip.trackedRunners]) {
    if (r.bib && !seen.has(r.bib)) {
      seen.add(r.bib);
      seeded.push({ bib: r.bib, name: r.name || null });
    }
  }
  return seeded;
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  } catch {
    return seedFromConfig();
  }
}

let runners = load();

function persist() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(runners, null, 2));
}

function list() {
  return runners;
}

function has(bib) {
  return runners.some((r) => r.bib === bib);
}

function add(bib, name) {
  if (has(bib)) return false;
  runners.push({ bib, name: name || null });
  persist();
  return true;
}

function remove(bib) {
  const before = runners.length;
  runners = runners.filter((r) => r.bib !== bib);
  if (runners.length < before) persist();
  return runners.length < before;
}

module.exports = { list, has, add, remove };

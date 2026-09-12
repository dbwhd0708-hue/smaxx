const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const trackingService = require('./trackingService');
const runnersRouter = require('./routes/runners');
const trackedRunnersRouter = require('./routes/trackedRunners');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', runnersRouter);
app.use('/api', trackedRunnersRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, dataSource: config.dataSource });
});

// In production this server also serves the built frontend (frontend/dist),
// so the whole app is one deployable service with no CORS/second-origin to
// configure. In local dev, frontend/dist won't exist — Vite's own dev
// server + its /api proxy (see frontend/vite.config.js) handles that case,
// so this block just does nothing.
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

trackingService.start();

app.listen(config.port, () => {
  console.log(`Marathon tracker backend listening on :${config.port} (dataSource=${config.dataSource})`);
});

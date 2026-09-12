const express = require('express');
const cors = require('cors');
const config = require('./config');
const trackingService = require('./trackingService');
const runnersRouter = require('./routes/runners');

const app = express();
app.use(cors());
app.use('/api', runnersRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, dataSource: config.dataSource });
});

trackingService.start();

app.listen(config.port, () => {
  console.log(`Marathon tracker backend listening on :${config.port} (dataSource=${config.dataSource})`);
});

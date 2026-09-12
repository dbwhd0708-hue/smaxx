const express = require('express');
const config = require('../config');
const store = require('../trackedRunnersStore');
const trackingService = require('../trackingService');
const myresultProvider = require('../providers/myresultProvider');

const router = express.Router();

router.get('/tracked-runners', (req, res) => {
  res.json(store.list());
});

router.post('/tracked-runners', async (req, res) => {
  const bib = String(req.body?.bib || '').trim();
  if (!bib) return res.status(400).json({ error: '배번호를 입력해주세요.' });
  if (store.has(bib)) return res.status(409).json({ error: '이미 추가된 배번호입니다.' });

  // myresult has a real JSON API, so verify the bib exists and fetch the
  // runner's real name right away — this is what lets bib-number lookup
  // resolve same-name ambiguity instead of just trusting free-text input.
  if (config.dataSource === 'myresult') {
    if (!config.myresult.eventId) {
      return res.status(400).json({ error: 'MYRESULT_EVENT_ID가 설정되어 있지 않습니다.' });
    }
    const [result] = await myresultProvider.fetchCheckpointRecords({
      eventId: config.myresult.eventId,
      baseUrl: config.myresult.baseUrl,
      trackedRunners: [{ bib }],
      requestDelayMs: 0,
    });
    if (result.error || result.records.length === 0) {
      return res.status(404).json({
        error: `배번호 ${bib}를 찾을 수 없습니다. 대회 ID와 배번호를 다시 확인해주세요.`,
      });
    }
    store.add(bib, result.name);
    await trackingService.pollOnce();
    return res.status(201).json({ bib, name: result.name });
  }

  // Other sources: add optimistically, name fills in on the next poll.
  store.add(bib, req.body?.name || null);
  await trackingService.pollOnce();
  res.status(201).json({ bib, name: req.body?.name || null });
});

router.delete('/tracked-runners/:bib', (req, res) => {
  const removed = store.remove(req.params.bib);
  if (!removed) return res.status(404).json({ error: '해당 배번호를 찾을 수 없습니다.' });
  trackingService.removeRunner(req.params.bib);
  res.status(204).end();
});

module.exports = router;

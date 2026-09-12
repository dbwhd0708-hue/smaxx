const express = require('express');
const trackingService = require('../trackingService');
const { defaultCourse } = require('../course');

const router = express.Router();

router.get('/course', (req, res) => {
  res.json(defaultCourse.toGeoJSON());
});

router.get('/runners', (req, res) => {
  res.json(trackingService.getSnapshot());
});

router.get('/runners/:bib', (req, res) => {
  const history = trackingService.getHistory(req.params.bib);
  if (!history) return res.status(404).json({ error: 'runner not found' });
  res.json(history);
});

module.exports = router;

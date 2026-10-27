const express = require('express');
const sensor = require('./sensor');

const app = express();
const PORT = process.env.PORT || 8080;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

sensor.startSensorLoop(3000);

function parseCount(value, fallback = Number.MAX_SAFE_INTEGER) {
  const count = Number.parseInt(value, 10);
  if (Number.isNaN(count) || count <= 0) {
    return fallback;
  }
  return Math.min(count, sensor.MAX_HISTORY);
}

app.get('/capteurs/temp/:count/moy', (req, res) => {
  const count = parseCount(req.params.count);
  res.json(sensor.getAverage('temp', count));
});

app.get('/capteurs/temp/:count', (req, res) => {
  const count = parseCount(req.params.count);
  res.json(sensor.getHistory('temp', count));
});

app.get('/capteurs/temp', (req, res) => {
  res.type('text/plain').send(String(sensor.getLast('temp')));
});

app.get('/capteurs/hum/:count/moy', (req, res) => {
  const count = parseCount(req.params.count);
  res.json(sensor.getAverage('hum', count));
});

app.get('/capteurs/hum/:count', (req, res) => {
  const count = parseCount(req.params.count);
  res.json(sensor.getHistory('hum', count));
});

app.get('/capteurs/hum', (req, res) => {
  res.type('text/plain').send(String(sensor.getLast('hum')));
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

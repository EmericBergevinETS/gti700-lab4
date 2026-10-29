const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const MAX_HISTORY = 720;

let lastCycle = null;

const sensorState = {
  temp: { history: [], lastValue: null },
  hum: { history: [], lastValue: null },
};

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getRawTemperature() {
  const base = 21.0;
  const variation = (Math.random() - 0.5) * 4;
  return Number((base + variation).toFixed(1));
}

function getRawHumidity() {
  const base = 68.0;
  const variation = (Math.random() - 0.5) * 20;
  return Number((base + variation).toFixed(1));
}

function addValue(type, value) {
  const entry = {
    timestamp: formatTimestamp(),
    value,
  };

  const store = sensorState[type];
  store.history.push(entry);
  if (store.history.length > MAX_HISTORY) {
    store.history.shift();
  }
  store.lastValue = value;
}

function readSensor(type) {
  if (type === 'temp') {
    return getRawTemperature();
  }
  if (type === 'hum') {
    return getRawHumidity();
  }
  throw new Error(`Unknown sensor type: ${type}`);
}

function startSimulatedLoop(intervalMs) {
  const sample = () => {
    addValue('temp', readSensor('temp'));
    addValue('hum', readSensor('hum'));
  };

  sample();
  return setInterval(sample, intervalMs);
}

// Lance messages.py (labo 3) en mode affichage seul : il imprime un JSON F2
// par ligne sur stdout (sequence, timestamp, temperature, humidite, bouton, tactile, son).
function startRealSensor(onFailure) {
  const python = process.env.PYTHON || 'python3';
  const script = path.join(__dirname, 'messages.py');
  const child = spawn(python, ['-u', script, '--format', 'F2'], { cwd: __dirname });

  readline.createInterface({ input: child.stdout }).on('line', (line) => {
    let cycle;
    try {
      cycle = JSON.parse(line);
    } catch {
      return;
    }
    lastCycle = cycle;
    // DHT11 : lecture invalide => valeurs null, on ne les ajoute pas à l'historique.
    if (cycle.temperature !== null) {
      addValue('temp', cycle.temperature);
    }
    if (cycle.humidite !== null) {
      addValue('hum', cycle.humidite);
    }
  });

  child.stderr.on('data', (data) => process.stderr.write(`[messages.py] ${data}`));

  let failed = false;
  const fail = (reason) => {
    if (failed) {
      return;
    }
    failed = true;
    console.error(`Capteurs réels indisponibles (${reason}), passage en mode simulé.`);
    onFailure();
  };
  child.on('error', (err) => fail(err.message));
  child.on('exit', (code) => fail(`messages.py terminé avec le code ${code}`));

  process.on('exit', () => child.kill());
  return child;
}

function startSensorLoop(intervalMs = 3000) {
  if (process.env.SENSOR_MODE === 'sim' || process.platform !== 'linux') {
    return startSimulatedLoop(intervalMs);
  }
  return startRealSensor(() => startSimulatedLoop(intervalMs));
}

function getLastCycle() {
  return lastCycle;
}

function getLast(type) {
  const store = sensorState[type];
  if (store.history.length === 0) {
    return 0;
  }
  return Number(store.history[store.history.length - 1].value);
}

function getHistory(type, limit = Number.MAX_SAFE_INTEGER) {
  const store = sensorState[type];
  const values = store.history.slice(-limit);
  return values.map((entry) => [entry.timestamp, Number(entry.value)]);
}

function getAverage(type, limit = Number.MAX_SAFE_INTEGER) {
  const values = getHistory(type, limit).map(([, value]) => value);
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
}

module.exports = {
  MAX_HISTORY,
  startSensorLoop,
  getLast,
  getHistory,
  getAverage,
  getLastCycle,
};

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

function notify(onCycle, cycle) {
  if (typeof onCycle === 'function') {
    onCycle(cycle);
  }
}

function startSimulatedLoop(intervalMs, onCycle) {
  const sample = () => {
    const cycle = {
      sequence: 0,
      timestamp: formatTimestamp(),
      temperature: readSensor('temp'),
      humidite: readSensor('hum'),
    };
    addValue('temp', cycle.temperature);
    addValue('hum', cycle.humidite);
    notify(onCycle, cycle);
  };

  sample();
  return setInterval(sample, intervalMs);
}

// Lance messages.py (labo 3) en mode affichage seul : il imprime un JSON F2
// par ligne sur stdout (sequence, timestamp, temperature, humidite, bouton, tactile, son).
// --interval aligne la fréquence de lecture du DHT11 sur celle du module JS (3 s).
function startRealSensor(intervalMs, onFailure, onCycle) {
  const python = process.env.PYTHON || 'python3';
  const script = path.join(__dirname, 'messages.py');
  const child = spawn(python, [
    '-u', script,
    '--format', 'F2',
    '--interval', String(intervalMs / 1000),
  ], { cwd: __dirname });

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
    notify(onCycle, cycle);
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

function startSensorLoop(intervalMs = 3000, { onCycle } = {}) {
  if (process.env.SENSOR_MODE === 'sim' || process.platform !== 'linux') {
    return startSimulatedLoop(intervalMs, onCycle);
  }
  return startRealSensor(intervalMs, () => startSimulatedLoop(intervalMs, onCycle), onCycle);
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

// Tâche 1.1 : le module peut être exécuté seul (`node sensor.js`) et imprime
// chaque lecture du capteur dans la console, tout en tenant l'historique à jour.
if (require.main === module) {
  const intervalMs = Number(process.env.SENSOR_INTERVAL_MS) || 3000;

  const formatReading = (cycle) => {
    const temperature = cycle.temperature === null ? '--' : `${cycle.temperature} °C`;
    const humidite = cycle.humidite === null ? '--' : `${cycle.humidite} %`;
    return `${formatTimestamp()} -> Température : ${temperature}, Humidité : ${humidite}`;
  };

  const handle = startSensorLoop(intervalMs, {
    onCycle: (cycle) => console.log(formatReading(cycle)),
  });

  const stop = () => {
    if (handle && typeof handle.kill === 'function') {
      handle.kill();
    } else if (handle) {
      clearInterval(handle);
    }
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

module.exports = {
  MAX_HISTORY,
  startSensorLoop,
  getLast,
  getHistory,
  getAverage,
  getLastCycle,
};

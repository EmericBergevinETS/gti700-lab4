const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8889;
const BACKEND_URL = (process.env.BACKEND_URL || 'http://10.196.122.36:8080').replace(/\/+$/, '');

// Expose l'adresse du backend à la page sans avoir à modifier index.html.
app.get('/config.js', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('application/javascript');
  res.send(`window.BACKEND_URL = ${JSON.stringify(BACKEND_URL)};`);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/affichage', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend listening on http://localhost:${PORT}`);
  console.log(`Expected backend at ${BACKEND_URL}`);
});

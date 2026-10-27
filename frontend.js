const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8889;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

app.use(express.static(path.join(__dirname, 'public')));

app.get('/affichage', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend listening on http://localhost:${PORT}`);
  console.log(`Expected backend at ${BACKEND_URL}`);
});

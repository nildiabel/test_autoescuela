const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const { initDatabase } = require('./config/database');

const app = express();
const port = Number(process.argv[2]) || 40550;
const dades = require('./data.json');

let NumPreguntes = 10;
const sessions = new Map();

app.use(cors());
app.use(express.static('frontend'));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());

function barrejarArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

app.get('/api/preguntes', (req, res) => {
  const totesLesPreguntes = [...dades.preguntes];
  const preguntesBarrejades = barrejarArray(totesLesPreguntes);
  const preguntesSeleccionades = preguntesBarrejades.slice(0, NumPreguntes);

  const sessionId = uuidv4();

  sessions.set(sessionId, {
    questions: preguntesSeleccionades.map(q => q.id)
  });
  console.log(`Sessió creada: ${sessionId}`);

  const preguntesClientss = preguntesSeleccionades.map(question => {
    const q = { ...question };
    delete q.resposta_correcta;
    return q;
  });

  res.json({
    sessionId: sessionId,
    questions: preguntesClientss
  });
});

// 2. Initialize DB, then start Express server
async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
      console.log(`Servidor actiu a http://localhost:${port}`);
    });
  }
}

startServer();

module.exports = app;
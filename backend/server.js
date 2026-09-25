// backend/server.js
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const { pool } = require('./config/database');

const app = express();
const port = Number(process.argv[2]) || 40550;

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

// ==========================================
// ENDPOINT DEL JOC (No trenca el client)
// ==========================================
app.get('/api/preguntes', async (req, res) => {
  try {
    // Obtenim Totes les preguntes de MySQL
    const [rows] = await pool.query('SELECT * FROM questions');

    // Transformació de dades: MySQL pot retornar les respostes com un string o com objecte depenent del driver
    const totesLesPreguntes = rows.map(row => ({
      id: row.id,
      pregunta: row.pregunta,
      respostes: typeof row.respostes === 'string' ? JSON.parse(row.respostes) : row.respostes,
      resposta_correcta: row.resposta_correcta,
      imatge: row.imatge
    }));

    // Lògica del joc: barrejar i seleccionar
    const preguntesBarrejades = barrejarArray(totesLesPreguntes);
    const preguntesSeleccionades = preguntesBarrejades.slice(0, NumPreguntes);

    const sessionId = uuidv4();
    sessions.set(sessionId, {
      questions: preguntesSeleccionades.map(q => q.id)
    });
    console.log(`Sessió creada: ${sessionId}`);

    // Transformem de nou per amagar la resposta correcta al client
    const preguntesClients = preguntesSeleccionades.map(question => {
      const q = { ...question };
      delete q.resposta_correcta;
      return q;
    });

    res.json({
      sessionId: sessionId,
      questions: preguntesClients
    });

  } catch (error) {
    console.error("Error al servidor:", error);
    res.status(500).json({ error: "Error intern del servidor" });
  }
});

// Llistar TOTES les preguntes originals (CRUD Read)
app.get('/api/crud/preguntes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM questions');
    res.json(rows.map(row => ({
        ...row,
        respostes: typeof row.respostes === 'string' ? JSON.parse(row.respostes) : row.respostes
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear una pregunta (CRUD Create)
app.post('/api/crud/preguntes', async (req, res) => {
  const { pregunta, respostes, resposta_correcta, imatge } = req.body;
  try {
    const sql = 'INSERT INTO questions (pregunta, respostes, resposta_correcta, imatge) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(sql, [pregunta, JSON.stringify(respostes), resposta_correcta, imatge || null]);
    res.status(201).json({ id: result.insertId, missatge: "Pregunta creada correctament" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Modificar una pregunta (CRUD Update)
app.put('/api/crud/preguntes/:id', async (req, res) => {
  const { id } = req.params;
  const { pregunta, respostes, resposta_correcta, imatge } = req.body;
  try {
    const sql = 'UPDATE questions SET pregunta = ?, respostes = ?, resposta_correcta = ?, imatge = ? WHERE id = ?';
    await pool.query(sql, [pregunta, JSON.stringify(respostes), resposta_correcta, imatge || null, id]);
    res.json({ missatge: "Pregunta modificada correctament" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar una pregunta (CRUD Delete)
app.delete('/api/crud/preguntes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM questions WHERE id = ?', [id]);
    res.json({ missatge: "Pregunta eliminada correctament" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Servidor actiu a http://localhost:${port}`);
  });
}

module.exports = app;
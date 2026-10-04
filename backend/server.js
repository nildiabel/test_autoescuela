// backend/server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const multer = require('multer');

const { pool } = require('./config/database');

const app = express();
const port = Number(process.env.PORT || process.argv[2]) || 40550;
const uploadsDirectory = path.join(__dirname, '../frontend/uploads');
const imageMimeExtensions = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp']
]);

fs.mkdirSync(uploadsDirectory, { recursive: true });

let NumPreguntes = 10;
const sessions = new Map();

app.use(cors());
app.use('/uploads', express.static(uploadsDirectory));
app.use(express.static('frontend'));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDirectory,
    filename: (req, file, callback) => {
      callback(null, `${uuidv4()}${imageMimeExtensions.get(file.mimetype)}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    const extension = imageMimeExtensions.get(file.mimetype);
    const originalExtension = path.extname(file.originalname).toLowerCase();

    if (!extension || (originalExtension && originalExtension !== extension &&
      !(extension === '.jpg' && originalExtension === '.jpeg'))) {
      const error = new Error('El fitxer ha de ser una imatge JPG, PNG, GIF o WebP.');
      error.code = 'INVALID_IMAGE_TYPE';
      callback(error);
      return;
    }

    callback(null, true);
  }
});

function isValidImageContent(file) {
  const content = fs.readFileSync(file.path);
  const signatures = {
    'image/jpeg': content.length >= 3 &&
      content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff,
    'image/png': content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/gif': content.subarray(0, 6).toString('ascii') === 'GIF87a' ||
      content.subarray(0, 6).toString('ascii') === 'GIF89a',
    'image/webp': content.subarray(0, 4).toString('ascii') === 'RIFF' &&
      content.subarray(8, 12).toString('ascii') === 'WEBP'
  };

  return signatures[file.mimetype] === true;
}

function questionDataFromRequest(req) {
  let respostes = req.body.respostes;
  if (typeof respostes === 'string') {
    try {
      respostes = JSON.parse(respostes);
    } catch {
      const error = new Error('Les respostes han de ser un array vàlid.');
      error.code = 'INVALID_QUESTION_DATA';
      throw error;
    }
  }

  const respostaCorrecta = Number(req.body.resposta_correcta);
  if (
    typeof req.body.pregunta !== 'string' ||
    req.body.pregunta.trim() === '' ||
    !Array.isArray(respostes) ||
    respostes.length < 2 ||
    !respostes.every(resposta => typeof resposta === 'string' && resposta.trim() !== '') ||
    !Number.isInteger(respostaCorrecta) ||
    respostaCorrecta < 0 ||
    respostaCorrecta >= respostes.length
  ) {
    const error = new Error('La pregunta, les respostes o l’índex correcte no són vàlids.');
    error.code = 'INVALID_QUESTION_DATA';
    throw error;
  }

  return {
    pregunta: req.body.pregunta.trim(),
    respostes: respostes.map(resposta => resposta.trim()),
    respostaCorrecta,
    imatge: req.file ? `/uploads/${req.file.filename}` : (req.body.imatge || null)
  };
}

function removeFailedUpload(file) {
  if (!file) return;

  try {
    fs.unlinkSync(file.path);
  } catch (error) {
    console.error('No s’ha pogut esborrar el fitxer pujat després d’un error:', error);
  }
}

function barrejarArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

app.get('/api/preguntes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM questions');

    const totesLesPreguntes = rows.map(row => ({
      id: row.id,
      pregunta: row.pregunta,
      respostes: typeof row.respostes === 'string' ? JSON.parse(row.respostes) : row.respostes,
      resposta_correcta: row.resposta_correcta,
      imatge: row.imatge
    }));

    const preguntesBarrejades = barrejarArray(totesLesPreguntes);
    const preguntesSeleccionades = preguntesBarrejades.slice(0, NumPreguntes);

    const sessionId = uuidv4();
    sessions.set(sessionId, {
      questions: preguntesSeleccionades.map(q => ({
        ...q,
        respostaCorrecta: q.resposta_correcta,
        nombreRespostes: q.respostes.length
      }))
    });
    console.log(`Sessió creada: ${sessionId}`);

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

app.post('/api/finalitza', (req, res) => {
  const { sessionId, respostes } = req.body;
  const sessio = sessions.get(sessionId);

  if (!sessio) {
    return res.status(404).json({ error: 'La sessió no existeix o ha caducat' });
  }

  if (
    !Array.isArray(respostes) ||
    respostes.length !== sessio.questions.length ||
    !respostes.every((resposta, index) =>
      Number.isInteger(resposta) &&
      resposta >= 0 &&
      resposta < sessio.questions[index].nombreRespostes
    )
  ) {
    return res.status(400).json({ error: 'Les respostes enviades no són vàlides' });
  }

  const respostesCorrectes = respostes.reduce(
    (total, resposta, index) =>
      total + Number(resposta === sessio.questions[index].respostaCorrecta),
    0
  );
  const preguntesFallades = sessio.questions.reduce((fallades, pregunta, index) => {
    if (respostes[index] !== pregunta.respostaCorrecta) {
      fallades.push({
        pregunta: pregunta.pregunta,
        respostes: pregunta.respostes,
        respostaCorrecta: pregunta.respostaCorrecta,
        respostaUsuari: respostes[index],
        imatge: pregunta.imatge
      });
    }
    return fallades;
  }, []);

  sessions.delete(sessionId);
  res.json({
    totalRespostes: sessio.questions.length,
    respostesCorrectes,
    preguntesFallades
  });
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
app.post('/api/crud/preguntes', imageUpload.single('imatgeFile'), async (req, res, next) => {
  try {
    if (req.file && !isValidImageContent(req.file)) {
      removeFailedUpload(req.file);
      return res.status(400).json({ error: 'El contingut del fitxer no és una imatge vàlida.' });
    }

    const { pregunta, respostes, respostaCorrecta, imatge } = questionDataFromRequest(req);
    const sql = 'INSERT INTO questions (pregunta, respostes, resposta_correcta, imatge) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(sql, [pregunta, JSON.stringify(respostes), respostaCorrecta, imatge]);
    res.status(201).json({
      id: result.insertId,
      imatge,
      missatge: "Pregunta creada correctament"
    });
  } catch (error) {
    removeFailedUpload(req.file);
    if (error.code === 'INVALID_QUESTION_DATA') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// Modificar una pregunta (CRUD Update)
app.put('/api/crud/preguntes/:id', imageUpload.single('imatgeFile'), async (req, res, next) => {
  const { id } = req.params;
  try {
    if (req.file && !isValidImageContent(req.file)) {
      removeFailedUpload(req.file);
      return res.status(400).json({ error: 'El contingut del fitxer no és una imatge vàlida.' });
    }

    const { pregunta, respostes, respostaCorrecta, imatge } = questionDataFromRequest(req);
    const sql = 'UPDATE questions SET pregunta = ?, respostes = ?, resposta_correcta = ?, imatge = ? WHERE id = ?';
    await pool.query(sql, [pregunta, JSON.stringify(respostes), respostaCorrecta, imatge, id]);
    res.json({ imatge, missatge: "Pregunta modificada correctament" });
  } catch (error) {
    removeFailedUpload(req.file);
    if (error.code === 'INVALID_QUESTION_DATA') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
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

app.use((error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'La imatge no pot superar els 5 MB.' });
  }

  if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE' ||
    error.code === 'INVALID_IMAGE_TYPE') {
    return res.status(400).json({ error: error.message });
  }

  console.error('Error processant la petició:', error);
  res.status(500).json({ error: 'Error intern del servidor' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Servidor actiu a http://localhost:${port}`);
  });
}

module.exports = app;
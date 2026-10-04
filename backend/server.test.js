jest.mock('./config/database', () => {
  const questions = [
    { id: 1, pregunta: 'Pregunta 1', respostes: ['A', 'B'], resposta_correcta: 1, imatge: null },
    { id: 2, pregunta: 'Pregunta 2', respostes: ['A', 'B', 'C'], resposta_correcta: 0, imatge: null }
  ];

  return {
    pool: {
      query: jest.fn().mockResolvedValue([questions, []])
    }
  };
});

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('./server');
const { pool } = require('./config/database');

const uploadedImagesDirectory = path.join(__dirname, '../frontend/uploads');
const uploadedFiles = [];

afterEach(() => {
  uploadedFiles.splice(0).forEach(filename => {
    const filePath = path.join(uploadedImagesDirectory, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
});

describe('GET /api/preguntes', () => {
  it('Debería devolver un sessionId y un array de preguntas', async () => {
    const res = await request(app).get('/api/preguntes');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body).toHaveProperty('questions');
    expect(Array.isArray(res.body.questions)).toBe(true);

    if (res.body.questions.length > 0) {
      const primeraPregunta = res.body.questions[0];
      expect(primeraPregunta).not.toHaveProperty('resposta_correcta');
    }
  });
});

describe('POST /api/finalitza', () => {
  it('retorna la puntuació a partir de les respostes guardades a la sessió', async () => {
    const partida = await request(app).get('/api/preguntes');
    const respostes = partida.body.questions.map(pregunta =>
      pregunta.id === 1 ? 1 : 0
    );

    const resultat = await request(app)
      .post('/api/finalitza')
      .send({ sessionId: partida.body.sessionId, respostes });

    expect(resultat.statusCode).toBe(200);
    expect(resultat.body).toEqual({
      totalRespostes: 2,
      respostesCorrectes: 2,
      preguntesFallades: []
    });
  });

  it('inclou les preguntes fallades i les respostes correcta i seleccionada', async () => {
    const partida = await request(app).get('/api/preguntes');
    const respostes = partida.body.questions.map(pregunta =>
      pregunta.id === 1 ? 0 : 0
    );

    const resultat = await request(app)
      .post('/api/finalitza')
      .send({ sessionId: partida.body.sessionId, respostes });

    expect(resultat.statusCode).toBe(200);
    expect(resultat.body).toEqual({
      totalRespostes: 2,
      respostesCorrectes: 1,
      preguntesFallades: [{
        pregunta: 'Pregunta 1',
        respostes: ['A', 'B'],
        respostaCorrecta: 1,
        respostaUsuari: 0,
        imatge: null
      }]
    });
  });

  it('rebutja els índexs de resposta que no són vàlids', async () => {
    const partida = await request(app).get('/api/preguntes');

    const resultat = await request(app)
      .post('/api/finalitza')
      .send({
        sessionId: partida.body.sessionId,
        respostes: partida.body.questions.map(() => 99)
      });

    expect(resultat.statusCode).toBe(400);
  });

});

describe('POST /api/crud/preguntes', () => {
  it('desa una imatge pujada i guarda el seu path a la base de dades', async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x00
    ]);
    pool.query.mockResolvedValueOnce([{ insertId: 42 }, []]);

    const resultat = await request(app)
      .post('/api/crud/preguntes')
      .field('pregunta', 'Quina senyal indica stop?')
      .field('respostes', JSON.stringify(['Stop', 'Cedir el pas']))
      .field('resposta_correcta', '0')
      .attach('imatgeFile', png, { filename: 'senyal.png', contentType: 'image/png' });

    expect(resultat.statusCode).toBe(201);
    expect(resultat.body.id).toBe(42);

    const [, valors] = pool.query.mock.calls.at(-1);
    expect(valors).toEqual([
      'Quina senyal indica stop?',
      JSON.stringify(['Stop', 'Cedir el pas']),
      0,
      resultat.body.imatge
    ]);
    expect(resultat.body.imatge).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);

    const nomFitxer = path.basename(resultat.body.imatge);
    uploadedFiles.push(nomFitxer);
    const contingutServit = await request(app).get(resultat.body.imatge);
    expect(contingutServit.statusCode).toBe(200);
    expect(contingutServit.body).toEqual(png);
  });

  it('rebutja pujades que no són imatges', async () => {
    const resultat = await request(app)
      .post('/api/crud/preguntes')
      .field('pregunta', 'Pregunta invàlida')
      .field('respostes', JSON.stringify(['A', 'B']))
      .field('resposta_correcta', '0')
      .attach('imatgeFile', Buffer.from('no es una imagen'), {
        filename: 'notes.txt',
        contentType: 'text/plain'
      });

    expect(resultat.statusCode).toBe(400);
    expect(resultat.body.error).toMatch(/imatge JPG, PNG, GIF o WebP/);
  });
});
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

const request = require('supertest');
const app = require('./server');

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
      respostesCorrectes: 2
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
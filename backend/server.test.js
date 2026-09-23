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
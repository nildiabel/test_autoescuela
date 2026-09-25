// config/database.js
const mysql = require('mysql2/promise');
const path = require('path');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: 'usuario',
  password: 'password123',
  database: 'mi_base_de_datos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initDatabase() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pregunta TEXT NOT NULL,
      respostes JSON NOT NULL,
      resposta_correcta INT NOT NULL,
      imatge VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  try {
    await pool.query(createTableSql);
    console.log("Tabla 'questions' verificada / creada.");

    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM questions');
    
    if (rows[0].total === 0) {
      console.log('Tabla vacía. Insertando preguntas desde data.json...');

      const dades = require(path.join(__dirname, '../data.json'));
      const preguntes = dades.preguntes;

      if (preguntes && preguntes.length > 0) {
        const values = preguntes.map(q => [
          q.pregunta,
          JSON.stringify(q.respostes),
          q.resposta_correcta,
          q.imatge || null
        ]);

        const insertSql = `
          INSERT INTO questions (pregunta, respostes, resposta_correcta, imatge) 
          VALUES ?
        `;

        await pool.query(insertSql, [values]);
        console.log(`Se han insertado ${values.length} preguntas correctamente.`);
      }
    } else {
      console.log(`La tabla ya contiene ${rows[0].total} preguntas.`);
    }

  } catch (err) {
    console.error('Error inicializando la base de datos o insertando datos:', err.message);
  }
}

module.exports = { pool, initDatabase };
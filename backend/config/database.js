
const mysql = require('mysql2/promise');

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
  const sql = `
    CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pregunta TEXT NOT NULL,
      respostes JSON NOT NULL,
      resposta_correcta INT NOT NULL,
      imatge VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  try {
    await pool.query(sql);
    console.log("Taula 'questions' verificada / creada correctament.");
  } catch (err) {
    console.error("Error inicialitzant la base de dades:", err.message);
  }
}

module.exports = { pool, initDatabase };
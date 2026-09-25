// backend/migrate.js
const { pool } = require('./config/database');
const dades = require('./data.json');

async function executarMigracio() {
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
    console.log("✔️ Taula 'questions' verificada / creada.");

    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM questions');
    
    if (rows[0].total === 0) {
      console.log('Migrant dades des de data.json...');

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
        console.log(`✔️ S'han inserit ${values.length} preguntes a la base de dades.`);
      }
    } else {
      console.log(`ℹ️ La taula ja conté ${rows[0].total} preguntes. No s'ha fet la migració.`);
    }
  } catch (err) {
    console.error('❌ Error durant la migració:', err.message);
  } finally {
    pool.end(); 
  }
}

executarMigracio();
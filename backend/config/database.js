// backend/config/database.js
const mysql = require('mysql2/promise');

function requiredEnv(name) {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required database environment variable: ${name}`);
  }

  return value;
}

const pool = mysql.createPool({
  host: requiredEnv('DB_HOST'),
  user: requiredEnv('DB_USER'),
  password: requiredEnv('DB_PASSWORD'),
  database: requiredEnv('DB_NAME'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = { pool };
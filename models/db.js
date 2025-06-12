const mysql = require('mysql2');

const pool = mysql.createPool({
  host: '35.225.51.145',
  user: 'root',
  password: '*N.3a@Q2^/}GP4/t',
  database: 'tgApp',
  port: 3306,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Cria também um pool de promises para as novas funções
const promisePool = pool.promise();

// Testa a conexão (versão callback)
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err.message);
  } else {
    console.log('Conectado ao banco de dados MySQL!');
    connection.release();
  }
});

// Exporta ambos
module.exports = {
  pool,          // Para o código legado (callbacks)
  promisePool    // Para o novo código (async/await)
};


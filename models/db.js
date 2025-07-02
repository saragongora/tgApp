const mysql = require('mysql2');

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '******',
  database: 'tgApp',
  port: 3306,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err.message);
  } else {
    console.log('Conectado ao banco de dados MySQL!');
    connection.release();
  }
});

module.exports = {
  pool,         
  promisePool    
};


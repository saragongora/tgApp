const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: '35.225.51.145', 
  user: 'root',                     
  password: '*N.3a@Q2^/}GP4/t',       
  database: 'tgapp',   
  port: 3306,             
  charset: 'utf8mb4'
});

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err.message);
    return;
  }
  console.log('Conectado ao banco de dados MySQL!');
});

module.exports = connection;
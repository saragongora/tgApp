const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',        // ou o IP do seu banco
  user: 'root',             // ou outro usuário
  password: 'jeanali',    // sua senha do MySQL
  database: 'tgapp' // o nome do banco que você criou
});

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err.message);
    return;
  }
  console.log('Conectado ao banco de dados MySQL!');
});

module.exports = connection;

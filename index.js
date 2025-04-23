const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('./models/db');


const app = express();

// Configurações do Express
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Configuração de sessão
app.use(session({
  secret: 'chave-super-secreta',
  resave: false,
  saveUninitialized: false
}));

// Configurações do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar o multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Rota para a página inicial (redireciona pro login)
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Rota GET para exibir a tela de login
app.get('/login', (req, res) => {
  res.render('login_adm', { erro: null });
});

app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;

  const USUARIO_PADRAO = 'admin';
  const SENHA_PADRAO = '123456';

  if (usuario === USUARIO_PADRAO && senha === SENHA_PADRAO) {
    req.session.logado = true;
    res.redirect('/painel');
  } else {
    res.render('login_adm', { erro: 'Usuário ou senha incorretos!' });
  }
});

// Rota de logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Rota pagina adm
app.get('/painel', (req, res) => {
  if (req.session.logado) {
    res.render('pagina_adm'); // Renderiza o arquivo pagina_adm.ejs
  } else {
    res.redirect('/login');
  }
});

// Rota GET para o formulário de registro
app.get('/add-registro', (req, res) => {
  if (req.session.logado) {
    res.render('addRegistro');
  } else {
    res.redirect('/login');
  }
});

// Rota POST para salvar novo registro
app.post('/add-registro', upload.single('arquivo'), (req, res) => {
  if (!req.session.logado) return res.redirect('/login');

  const {
    nome_trabalho,
    tipo_trabalho,
    ano_conclusao,
    semestre,
    curso
  } = req.body;

  const alunos = Array.isArray(req.body.alunos) ? req.body.alunos : [req.body.alunos];
  const orientadores = Array.isArray(req.body.orientadores) ? req.body.orientadores : [req.body.orientadores];
  const arquivo = req.file.buffer;

  const sqlTg = `INSERT INTO tg (tipo, nome_tg, curso, ano, semestre, arquivo) VALUES (?, ?, ?, ?, ?, ?)`;
  const tgValues = [tipo_trabalho, nome_trabalho, curso, ano_conclusao, semestre, arquivo];

  connection.query(sqlTg, tgValues, (err, result) => {
    if (err) return res.send('Erro ao inserir trabalho: ' + err);
    const idTg = result.insertId;

    alunos.forEach(nome => {
      if (!nome.trim()) return;
      connection.query(`INSERT INTO aluno (nome_aluno) VALUES (?)`, [nome], (err, result) => {
        if (err) return console.log('Erro ao inserir aluno: ', err);
        const idAluno = result.insertId;
        connection.query(`INSERT INTO aluno_tg (id_aluno, id_tg) VALUES (?, ?)`, [idAluno, idTg]);
      });
    });

    orientadores.forEach(nome => {
      if (!nome.trim()) return;
      const idOrientador = uuidv4();
      connection.query(`INSERT INTO orientador (id_orientador, nome_orientador) VALUES (?, ?)`, [idOrientador, nome], (err) => {
        if (err) return console.log('Erro ao inserir orientador: ', err);
        connection.query(`INSERT INTO orientador_tg (id_orientador, id_tg) VALUES (?, ?)`, [idOrientador, idTg]);
      });
    });

    res.redirect('/painel');
  });
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

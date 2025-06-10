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

// Configurar multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- Rotas ---

// Página inicial → redireciona pro login
app.get('/', (req, res) => {
  res.redirect('/home');
});

// Tela de login
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

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Painel administrativo
app.get('/painel', (req, res) => {
  if (req.session.logado) {
    res.render('pagina_adm', {
      resultados: [],
      buscaRealizada: false,
      termo: '',
      ano_conclusao: '',
      semestre: '',
      curso: '',
      tipo_trabalho: ''
    });
  } else {
    res.redirect('/login');
  }
});



// Tela de adicionar novo registro
app.get('/add-registro', (req, res) => {
  if (req.session.logado) {
    res.render('add_registro');
  } else {
    res.redirect('/login');
  }
});

// Salvar novo registro
app.post('/add-registro', upload.single('arquivo'), (req, res) => {
  if (!req.session.logado) return res.redirect('/login');

  const {
    nome_trabalho,
    tipo_trabalho,
    ano_conclusao,
    semestre,
    curso,
    alunos = [],
    orientadores = []
  } = req.body;

  const alunosArray = Array.isArray(alunos) ? alunos : [alunos];
  const orientadoresArray = Array.isArray(orientadores) ? orientadores : [orientadores];

  const arquivo = req.file ? req.file.buffer : null;
  const nomeArquivo = req.file ? req.file.originalname : null;

  const sqlTg = `INSERT INTO tg (tipo, nome_tg, curso, ano, semestre, arquivo, nome_arquivo) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const tgValues = [tipo_trabalho, nome_trabalho, curso, ano_conclusao, semestre, arquivo, nomeArquivo];

  db.query(sqlTg, tgValues, (err, result) => {
    if (err) return res.send('Erro ao inserir trabalho: ' + err);

    const idTg = result.insertId;

    alunosArray.forEach(nome => {
      if (!nome.trim()) return;
      db.query(`INSERT INTO aluno (nome_aluno) VALUES (?)`, [nome], (err, result) => {
        if (err) return console.log('Erro ao inserir aluno:', err);
        const idAluno = result.insertId;
        db.query(`INSERT INTO aluno_tg (id_aluno, id_tg) VALUES (?, ?)`, [idAluno, idTg]);
      });
    });

    orientadoresArray.forEach(nome => {
      if (!nome.trim()) return;
      const idOrientador = uuidv4();
      db.query(`INSERT INTO orientador (id_orientador, nome_orientador) VALUES (?, ?)`, [idOrientador, nome], (err) => {
        if (err) return console.log('Erro ao inserir orientador:', err);
        db.query(`INSERT INTO orientador_tg (id_orientador, id_tg) VALUES (?, ?)`, [idOrientador, idTg]);
      });
    });

    res.redirect('/painel');
  });
});


app.get('/buscar', (req, res) => {
  const termo = req.query.termo;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  if (!termo) {
    const view = req.session.logado ? 'pagina_adm' : 'home';
    return res.render(view, {
      resultados: [],
      buscaRealizada: false,
      termo: '',
      ano_conclusao: '',
      semestre: '',
      curso: '',
      tipo_trabalho: '',
      pagination: { // SEMPRE defina o objeto, mesmo vazio
    page: page || 1,
    totalPages: Math.ceil(total / limit) || 1,
    hasPrev: false,
    hasNext: false,
    totalResults: total || 0
  }
    });
  }

  const likeTerm = `%${termo}%`;

  // Query para contar o total de resultados
  const countQuery = `
    SELECT COUNT(DISTINCT tg.id_tg) as total
    FROM tg
    LEFT JOIN aluno_tg ON tg.id_tg = aluno_tg.id_tg
    LEFT JOIN aluno ON aluno.id_aluno = aluno_tg.id_aluno
    LEFT JOIN orientador_tg ON tg.id_tg = orientador_tg.id_tg
    LEFT JOIN orientador ON orientador.id_orientador = orientador_tg.id_orientador
    WHERE 
      tg.nome_tg LIKE ? OR 
      aluno.nome_aluno LIKE ? OR 
      orientador.nome_orientador LIKE ?
  `;

  // Query para buscar os resultados paginados
  const dataQuery = `
    SELECT tg.*, 
      GROUP_CONCAT(DISTINCT aluno.nome_aluno) AS alunos,
      GROUP_CONCAT(DISTINCT orientador.nome_orientador) AS orientadores
    FROM tg
    LEFT JOIN aluno_tg ON tg.id_tg = aluno_tg.id_tg
    LEFT JOIN aluno ON aluno.id_aluno = aluno_tg.id_aluno
    LEFT JOIN orientador_tg ON tg.id_tg = orientador_tg.id_tg
    LEFT JOIN orientador ON orientador.id_orientador = orientador_tg.id_orientador
    WHERE tg.id_tg IN (
      SELECT DISTINCT tg.id_tg
      FROM tg
      LEFT JOIN aluno_tg ON tg.id_tg = aluno_tg.id_tg
      LEFT JOIN aluno ON aluno.id_aluno = aluno_tg.id_aluno
      LEFT JOIN orientador_tg ON tg.id_tg = orientador_tg.id_tg
      LEFT JOIN orientador ON orientador.id_orientador = orientador_tg.id_orientador
      WHERE 
        tg.nome_tg LIKE ? OR 
        aluno.nome_aluno LIKE ? OR 
        orientador.nome_orientador LIKE ?
    )
    GROUP BY tg.id_tg
    LIMIT ? OFFSET ?
  `;

  db.query(countQuery, [likeTerm, likeTerm, likeTerm], (err, countResults) => {
    if (err) {
      console.error('Erro ao contar registros:', err);
      return res.send('Erro na busca');
    }

    const total = countResults[0].total;
    const totalPages = Math.ceil(total / limit);

    db.query(dataQuery, [likeTerm, likeTerm, likeTerm, limit, offset], (err, results) => {
      if (err) {
        console.error('Erro ao buscar registros:', err);
        return res.send('Erro na busca');
      }

      const registros = results.map(r => ({
        ...r,
        alunos: r.alunos ? r.alunos.split(',') : [],
        orientadores: r.orientadores ? r.orientadores.split(',') : []
      }));

      const view = req.session.logado ? 'pagina_adm' : 'home';

      res.render(view, {
        resultados: registros,
        buscaRealizada: true,
        termo,
        ano_conclusao: req.query.ano_conclusao || '',
        semestre: req.query.semestre || '',
        curso: req.query.curso || '',
        tipo_trabalho: req.query.tipo_trabalho || '',
        pagination: {
          page,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
          totalResults: total
        }
      });
    });
  });
});

// Rota GET para carregar formulário de edição
app.get('/editar/:id', (req, res) => {
  const idTg = req.params.id;

  const query = `
    SELECT tg.*, 
      GROUP_CONCAT(DISTINCT aluno.nome_aluno) AS alunos,
      GROUP_CONCAT(DISTINCT orientador.nome_orientador) AS orientadores
    FROM tg
    LEFT JOIN aluno_tg ON tg.id_tg = aluno_tg.id_tg
    LEFT JOIN aluno ON aluno.id_aluno = aluno_tg.id_aluno
    LEFT JOIN orientador_tg ON tg.id_tg = orientador_tg.id_tg
    LEFT JOIN orientador ON orientador.id_orientador = orientador_tg.id_orientador
    WHERE tg.id_tg = ?
    GROUP BY tg.id_tg
  `;

  db.query(query, [idTg], (err, results) => {
    if (err) return res.send('Erro ao carregar dados para edição: ' + err);
    if (results.length === 0) return res.send('Registro não encontrado');

    const registro = results[0];
    registro.alunos = registro.alunos ? registro.alunos.split(',') : [];
    registro.orientadores = registro.orientadores ? registro.orientadores.split(',') : [];

    res.render('editar_registro', { registro });
  });
});

app.post('/editar/:id', upload.single('arquivo'), async (req, res) => {
  const idTg = req.params.id;
  const {
    nome_trabalho,
    tipo_trabalho,
    ano_conclusao,
    semestre,
    curso,
    alunos = [],
    orientadores = []
  } = req.body;

  const alunosArray = Array.isArray(alunos) ? alunos : [alunos];
  const orientadoresArray = Array.isArray(orientadores) ? orientadores : [orientadores];
  const arquivo = req.file ? req.file.buffer : null;
  const nomeArquivo = req.file ? req.file.originalname : null;

  const queryPromise = (query, params = []) =>
    new Promise((resolve, reject) =>
      db.query(query, params, (err, result) => (err ? reject(err) : resolve(result)))
    );

  try {
    // Atualiza TG
    const updateSql = `
      UPDATE tg SET tipo = ?, nome_tg = ?, curso = ?, ano = ?, semestre = ?
      ${arquivo ? ', arquivo = ?, nome_arquivo = ?' : ''}
      WHERE id_tg = ?
    `;
    const updateValues = arquivo
      ? [tipo_trabalho, nome_trabalho, curso, ano_conclusao, semestre, arquivo, nomeArquivo, idTg]
      : [tipo_trabalho, nome_trabalho, curso, ano_conclusao, semestre, idTg];

    await queryPromise(updateSql, updateValues);

    // Limpa antigos vínculos
    await queryPromise(`DELETE FROM aluno_tg WHERE id_tg = ?`, [idTg]);
    await queryPromise(`DELETE FROM orientador_tg WHERE id_tg = ?`, [idTg]);

    // Adiciona alunos novamente
    for (const nome of alunosArray) {
      if (!nome.trim()) continue;

      const resultado = await queryPromise(`SELECT id_aluno FROM aluno WHERE nome_aluno = ?`, [nome]);
      let idAluno;

      if (resultado.length > 0) {
        idAluno = resultado[0].id_aluno;
      } else {
        const insert = await queryPromise(`INSERT INTO aluno (nome_aluno) VALUES (?)`, [nome]);
        idAluno = insert.insertId;
      }

      await queryPromise(`INSERT INTO aluno_tg (id_aluno, id_tg) VALUES (?, ?)`, [idAluno, idTg]);
    }

    // Adiciona orientadores novamente
    for (const nome of orientadoresArray) {
      if (!nome.trim()) continue;

      const resultado = await queryPromise(`SELECT id_orientador FROM orientador WHERE nome_orientador = ?`, [nome]);
      let idOrientador;

      if (resultado.length > 0) {
        idOrientador = resultado[0].id_orientador;
      } else {
        idOrientador = uuidv4();
        await queryPromise(`INSERT INTO orientador (id_orientador, nome_orientador) VALUES (?, ?)`, [idOrientador, nome]);
      }

      await queryPromise(`INSERT INTO orientador_tg (id_orientador, id_tg) VALUES (?, ?)`, [idOrientador, idTg]);
    }

    // Agora sim: remove os órfãos
    await queryPromise(`DELETE FROM aluno WHERE id_aluno NOT IN (SELECT DISTINCT id_aluno FROM aluno_tg)`);
    await queryPromise(`DELETE FROM orientador WHERE id_orientador NOT IN (SELECT DISTINCT id_orientador FROM orientador_tg)`);

    res.redirect('/painel');
  } catch (err) {
    console.error('Erro ao editar registro:', err);
    res.send('Erro ao editar registro.');
  }
});



//Excluir registro
app.post('/excluir/:id', (req, res) => {
  const idTg = req.params.id;

  db.query(`DELETE FROM aluno_tg WHERE id_tg = ?`, [idTg]);
  db.query(`DELETE FROM orientador_tg WHERE id_tg = ?`, [idTg]);
  db.query(`DELETE FROM tg WHERE id_tg = ?`, [idTg], (err) => {
    if (err) return res.send('Erro ao excluir trabalho: ' + err);
    res.redirect('/painel');
  });
});


// Filtrar 
app.get('/filtro', (req, res) => {
  const { termo, ano_conclusao, semestre, curso, tipo_trabalho } = req.query;
  const view = req.session.logado ? 'pagina_adm' : 'home';

  let query = `
    SELECT tg.*, 
           GROUP_CONCAT(DISTINCT aluno.nome_aluno SEPARATOR ', ') AS alunos, 
           GROUP_CONCAT(DISTINCT orientador.nome_orientador SEPARATOR ', ') AS orientadores 
    FROM tg
    LEFT JOIN aluno_tg ON tg.id_tg = aluno_tg.id_tg
    LEFT JOIN aluno ON aluno.id_aluno = aluno_tg.id_aluno
    LEFT JOIN orientador_tg ON tg.id_tg = orientador_tg.id_tg
    LEFT JOIN orientador ON orientador.id_orientador = orientador_tg.id_orientador
    WHERE 1=1
  `;

  const params = [];

  if (termo) {
    query += `
      AND (
        tg.nome_tg LIKE ? OR 
        aluno.nome_aluno LIKE ? OR 
        orientador.nome_orientador LIKE ?
      )
    `;
    const termoLike = `%${termo}%`;
    params.push(termoLike, termoLike, termoLike);
  }

  if (ano_conclusao) {
    query += ' AND tg.ano = ?';
    params.push(ano_conclusao);
  }

  if (semestre) {
    query += ' AND tg.semestre = ?';
    params.push(semestre);
  }

  if (curso) {
    query += ' AND tg.curso = ?';
    params.push(curso);
  }

  if (tipo_trabalho) {
    query += ' AND tg.tipo = ?';
    params.push(tipo_trabalho);
  }

  query += ' GROUP BY tg.id_tg ORDER BY tg.ano DESC, tg.semestre DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Erro ao buscar registros:', err);
      return res.send('Erro ao buscar registros');
    }

    const registros = results.map(linha => ({
      ...linha,
      alunos: linha.alunos ? linha.alunos.split(', ') : [],
      orientadores: linha.orientadores ? linha.orientadores.split(', ') : [],
    }));

    res.render(view, {
      resultados: registros,
      buscaRealizada: true,
      termo,
      ano_conclusao,
      semestre,
      curso,
      tipo_trabalho
    });
  });
});


// Página pública (sem login)
app.get('/home', (req, res) => {
  res.render('home', {
    resultados: [],
    buscaRealizada: false,
    termo: '',
    ano_conclusao: '',
    semestre: '',
    curso: '',
    tipo_trabalho: ''
  });
});

// Rota para download de arquivo
app.get('/download/:id', (req, res) => {
  const idTg = req.params.id;

  const query = 'SELECT nome_arquivo, arquivo FROM tg WHERE id_tg = ?';
  db.query(query, [idTg], (err, results) => {
    if (err) {
      console.error('Erro ao buscar arquivo:', err);
      return res.status(500).send('Erro ao buscar o arquivo.');
    }

    if (results.length === 0) {
      return res.status(404).send('Arquivo não encontrado.');
    }

    const { nome_arquivo, arquivo } = results[0];

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nome_arquivo)}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(arquivo);
  });
});







// Iniciar servidor
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});

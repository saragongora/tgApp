const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { pool, promisePool } = require('./models/db'); 
const auth = require('./models/auth');

const app = express();

// Configurações do Express
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Configuração de sessão
app.use(session({
  secret: 'chave-super-secreta',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000 } 
}));

// Configurações do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware para verificar autenticação
function checkAuth(req, res, next) {
  if (req.session.logado || req.session.emailVerified) {
    return next();
  }
  res.redirect('/login-email');
}


// --- Rotas ---

// Página inicial
app.get('/', (req, res) => {
  if (req.session.emailVerified || req.session.logado) {
    // Se autenticado, mostra a home normalmente
    res.render('home', {
      resultados: [],
      buscaRealizada: false,
      termo: '',
      ano_conclusao: '',
      semestre: '',
      curso: '',
      tipo_trabalho: ''
    });
  } else {
    // Se não autenticado, redireciona para login
    res.redirect('/login-email');
  }
});

// Rotas de autenticação por email
app.get('/login-email', (req, res) => {
  res.render('login_email', { erro: null, message: null });
});

app.post('/login-email', async (req, res) => {
  const { email } = req.body;

  try {
    if (!auth.isValidFatecEmail(email)) {
      return res.render('login_email', {
        erro: 'Apenas e-mails @fatec.sp.gov.br são permitidos',
        message: null
      });
    }

    await auth.sendVerificationCode(email);

    return res.redirect(`/verify-code?email=${encodeURIComponent(email)}`);

  } catch (error) {
    res.render('login_email', {
      erro: error.message,
      message: null
    });
  }
});

// Tela de verificação de código
app.get('/verify-code', (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.redirect('/login-email');
  }

  res.render('verify_code', {
    erro: null,
    email,
    message: req.query.message || null
  });
});

app.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const isValid = await auth.verifyCode(email, code);
    if (isValid) {
      req.session.emailVerified = true;
      req.session.email = email;
      return res.redirect('/home');
    } else {
      res.render('verify_code', {
        erro: 'Código inválido ou expirado',
        email,
        message: null
      });
    }
  } catch (error) {
    res.render('verify_code', {
      erro: error.message,
      email,
      message: null
    });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login-email');
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

  pool.query(sqlTg, tgValues, (err, result) => {
    if (err) return res.send('Erro ao inserir trabalho: ' + err);

    const idTg = result.insertId;
    const errors = [];

    alunosArray.forEach(nome => {
      if (!nome.trim()) return;
      pool.query(`INSERT INTO aluno (nome_aluno) VALUES (?)`, [nome], (err, result) => {
        if (err) {
          errors.push(`Erro ao inserir aluno: ${err}`);
          return;
        }
        const idAluno = result.insertId;
        pool.query(`INSERT INTO aluno_tg (id_aluno, id_tg) VALUES (?, ?)`, [idAluno, idTg], (err) => {
          if (err) errors.push(`Erro ao vincular aluno: ${err}`);
        });
      });
    });

    orientadoresArray.forEach(nome => {
      if (!nome.trim()) return;
      const idOrientador = uuidv4();
      pool.query(`INSERT INTO orientador (id_orientador, nome_orientador) VALUES (?, ?)`,
        [idOrientador, nome], (err) => {
          if (err) {
            errors.push(`Erro ao inserir orientador: ${err}`);
            return;
          }
          pool.query(`INSERT INTO orientador_tg (id_orientador, id_tg) VALUES (?, ?)`,
            [idOrientador, idTg], (err) => {
              if (err) errors.push(`Erro ao vincular orientador: ${err}`);
            });
        });
    });

    if (errors.length > 0) {
      return res.send(`Alguns erros ocorreram: ${errors.join(', ')}`);
    }

    res.redirect('/painel');
  });
});


app.get('/buscar', (req, res) => {
  const termo = req.query.termo;
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
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
      pagination: {
        page: 1,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
        totalResults: 0
      }
    });
  }

  const likeTerm = `%${termo}%`;

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

  pool.query(countQuery, [likeTerm, likeTerm, likeTerm], (err, countResults) => {
    if (err) {
      console.error('Erro ao contar registros:', err);
      return res.send('Erro na busca');
    }

    const total = countResults[0].total;
    const totalPages = Math.ceil(total / limit);

    pool.query(dataQuery, [likeTerm, likeTerm, likeTerm, limit, offset], (err, results) => {
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

  pool.query(query, [idTg], (err, results) => {
    if (err) return res.send('Erro ao carregar dados para edição: ' + err);
    if (results.length === 0) return res.send('Registro não encontrado');

    const registro = results[0];
    registro.alunos = registro.alunos ? registro.alunos.split(',') : [];
    registro.orientadores = registro.orientadores ? registro.orientadores.split(',') : [];

    res.render('editar_registro', { registro });
  });
});

// Rota POST para processar edição 
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

  const queryPromise = (query, params = []) => {
    return new Promise((resolve, reject) => {
      pool.query(query, params, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };

  try {
  
    const updateSql = `
      UPDATE tg SET tipo = ?, nome_tg = ?, curso = ?, ano = ?, semestre = ?
      ${arquivo ? ', arquivo = ?, nome_arquivo = ?' : ''}
      WHERE id_tg = ?
    `;
    const updateValues = arquivo
      ? [tipo_trabalho, nome_trabalho, curso, ano_conclusao, semestre, arquivo, nomeArquivo, idTg]
      : [tipo_trabalho, nome_trabalho, curso, ano_conclusao, semestre, idTg];

    await queryPromise(updateSql, updateValues);

  
    await queryPromise(`DELETE FROM aluno_tg WHERE id_tg = ?`, [idTg]);
    await queryPromise(`DELETE FROM orientador_tg WHERE id_tg = ?`, [idTg]);

  
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


    await queryPromise(`DELETE FROM aluno WHERE id_aluno NOT IN (SELECT DISTINCT id_aluno FROM aluno_tg)`);
    await queryPromise(`DELETE FROM orientador WHERE id_orientador NOT IN (SELECT DISTINCT id_orientador FROM orientador_tg)`);

    res.redirect('/painel');
  } catch (err) {
    console.error('Erro ao editar registro:', err);
    res.send('Erro ao editar registro.');
  }
});



app.post('/excluir/:id', async (req, res) => {
  const idTg = req.params.id;
  let connection;

  try {
    connection = await promisePool.getConnection();
    await connection.beginTransaction();

    await connection.query(`DELETE FROM aluno_tg WHERE id_tg = ?`, [idTg]);
    await connection.query(`DELETE FROM orientador_tg WHERE id_tg = ?`, [idTg]);
    await connection.query(`DELETE FROM tg WHERE id_tg = ?`, [idTg]);
    
    await connection.commit();
    res.redirect('/painel');
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erro ao excluir registro:', err);
    res.send('Erro ao excluir trabalho: ' + err.message);
  } finally {
    if (connection) connection.release();
  }
});


// Filtrar com paginação 
app.get('/filtro', (req, res) => {
  const { termo, ano_conclusao, semestre, curso, tipo_trabalho } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 5; 
  const offset = (page - 1) * limit;

  const view = req.session.logado ? 'pagina_adm' : 'home';

  // Query para contar o total de resultados
  let countQuery = `
    SELECT COUNT(DISTINCT tg.id_tg) as total
    FROM tg
    LEFT JOIN aluno_tg ON tg.id_tg = aluno_tg.id_tg
    LEFT JOIN aluno ON aluno.id_aluno = aluno_tg.id_aluno
    LEFT JOIN orientador_tg ON tg.id_tg = orientador_tg.id_tg
    LEFT JOIN orientador ON orientador.id_orientador = orientador_tg.id_orientador
    WHERE 1=1
  `;

  // Query para buscar os resultados 
  let dataQuery = `
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
  const countParams = [];


  if (termo) {
    const termoLike = `%${termo}%`;
    const whereClause = `
      AND (
        tg.nome_tg LIKE ? OR 
        aluno.nome_aluno LIKE ? OR 
        orientador.nome_orientador LIKE ?
      )
    `;
    dataQuery += whereClause;
    countQuery += whereClause;
    params.push(termoLike, termoLike, termoLike);
    countParams.push(termoLike, termoLike, termoLike);
  }

  if (ano_conclusao) {
    dataQuery += ' AND tg.ano = ?';
    countQuery += ' AND tg.ano = ?';
    params.push(ano_conclusao);
    countParams.push(ano_conclusao);
  }

  if (semestre) {
    dataQuery += ' AND tg.semestre = ?';
    countQuery += ' AND tg.semestre = ?';
    params.push(semestre);
    countParams.push(semestre);
  }

  if (curso) {
    dataQuery += ' AND tg.curso = ?';
    countQuery += ' AND tg.curso = ?';
    params.push(curso);
    countParams.push(curso);
  }

  if (tipo_trabalho) {
    dataQuery += ' AND tg.tipo = ?';
    countQuery += ' AND tg.tipo = ?';
    params.push(tipo_trabalho);
    countParams.push(tipo_trabalho);
  }

  dataQuery += ' GROUP BY tg.id_tg ORDER BY tg.ano DESC, tg.semestre DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);


  pool.query(countQuery, countParams, (err, countResults) => {
    if (err) {
      console.error('Erro ao contar registros:', err);
      return res.send('Erro ao buscar registros');
    }

    const total = countResults[0].total;
    const totalPages = Math.ceil(total / limit);


    pool.query(dataQuery, params, (err, results) => {
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
        tipo_trabalho,
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


app.get('/home', checkAuth, (req, res) => {
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


app.get('/download/:id', (req, res) => {
  const idTg = req.params.id;

  const query = 'SELECT nome_arquivo, arquivo FROM tg WHERE id_tg = ?';

  pool.query(query, [idTg], (err, results) => {
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
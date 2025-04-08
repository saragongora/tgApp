const express = require('express');
const path = require('path');
const session = require('express-session');
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




// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});



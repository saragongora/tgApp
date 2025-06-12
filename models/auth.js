// models/auth.js
const nodemailer = require('nodemailer');
const { promisePool } = require('./db');  // Alteração na importação

// Configuração do transporter de e-mail (substitua com suas credenciais)
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: 'acessotgapp@gmail.com',
    pass: 'zyvl vqnt ulvy rfaw'
  }
});

// Gerar código aleatório de 6 dígitos (mantido igual)
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Verificar se o e-mail é válido (mantido igual)
function isValidFatecEmail(email) {
  return email.endsWith('@fatec.sp.gov.br');
}

// Enviar código por e-mail (atualizado para usar promisePool)
async function sendVerificationCode(email) {
  console.log(`📨 Tentando enviar código para: ${email}`);
  
  if (!isValidFatecEmail(email)) {
    console.log('❌ E-mail não é @fatec.sp.gov.br');
    throw new Error('Apenas e-mails @fatec.sp.gov.br são permitidos');
  }

  const codigo = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  let connection;
  try {
    connection = await promisePool.getConnection();  // Alteração aqui
    
    console.time('Tempo de inserção no banco');
    const [result] = await connection.query(
      'INSERT INTO access_codes (email, codigo, expires_at) VALUES (?, ?, ?)',
      [email, codigo, expiresAt]
    );
    console.timeEnd('Tempo de inserção no banco');
    
    console.log('📝 Código inserido no banco:', result.insertId);

    const mailOptions = {
      from: 'acessotgapp@gmail.com',
      to: email,
      subject: 'Seu código de acesso',
      text: `Seu código: ${codigo}\nExpira em 15 minutos.`
    };

    console.time('Tempo de envio de email');
    const info = await transporter.sendMail(mailOptions);
    console.timeEnd('Tempo de envio de email');
    
    return { success: true, codeId: result.insertId };
  } catch (error) {
    console.error('❌ Erro crítico:', error);
    
    if (error.code) {
      console.error('Código do erro MySQL:', error.code);
      console.error('SQL State:', error.sqlState);
      console.error('Query:', error.sql);
    }
    
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Verificar código (atualizado para usar promisePool)
async function verifyCode(email, codigo) {
  let connection;
  try {
    connection = await promisePool.getConnection();  // Alteração aqui
    await connection.beginTransaction();
    
    const [rows] = await connection.query(
      `SELECT * FROM access_codes 
       WHERE email = ? AND codigo = ? 
       AND expires_at > NOW() AND used = 0`,
      [email, codigo]
    );
    
    if (rows.length === 0) return false;
    
    await connection.query(
      `UPDATE access_codes SET used = 1 
       WHERE email = ? AND codigo = ?`,
      [email, codigo]
    );
    
    await connection.commit();
    return true;
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Verificação do transporter (mantida igual)
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erro na configuração do nodemailer:', error);
  } else {
    console.log('✅ Servidor de e-mail pronto para enviar mensagens');
  }
});

module.exports = {
  sendVerificationCode,
  verifyCode,
  isValidFatecEmail
};
// models/auth.js
const nodemailer = require('nodemailer');
const { promisePool } = require('./db');  // Alteração na importação

// Configuração do transporter de e-mail (substitua com suas credenciais)
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: 'acessotgapp@gmail.com',
    pass: '**********'
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

  console.log(`🔑 Código gerado: ${codigo}`);
  console.log(`⏳ Expira em: ${expiresAt}`);

  let connection;
  try {
    connection = await promisePool.getConnection();
    
    // Verifique a conexão
    const [ping] = await connection.query('SELECT 1');
    console.log('✅ Teste de conexão com o banco:', ping);
    
    console.time('Tempo de inserção no banco');
    const [result] = await connection.query(
      'INSERT INTO access_codes (email, codigo, expires_at) VALUES (?, ?, ?)',
      [email, codigo, expiresAt]
    );
    console.timeEnd('Tempo de inserção no banco');
    
    console.log('📝 Código inserido no banco. ID:', result.insertId);

    // Verifique se o código realmente foi inserido
    const [check] = await connection.query(
      'SELECT * FROM access_codes WHERE id = ?',
      [result.insertId]
    );
    console.log('🔍 Verificação pós-insert:', check[0]);

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
    connection = await promisePool.getConnection();
    
    console.log(`🔍 Verificando código para ${email}: ${codigo}`);
    console.log('⏳ Hora atual no servidor:', new Date());
    
    // Primeiro: Verifique se há algum código para este email
    const [allCodes] = await connection.query(
      'SELECT id, codigo, expires_at, used FROM access_codes WHERE email = ? ORDER BY expires_at DESC',
      [email]
    );
    console.log('📋 Todos os códigos para este email:', allCodes);
    
    // Depois: Faça a verificação específica
    const [rows] = await connection.query(
      `SELECT id, email, codigo, expires_at, used, 
       NOW() as db_time,
       expires_at > NOW() as is_not_expired
       FROM access_codes 
       WHERE email = ? AND codigo = ? AND used = 0`,
      [email, codigo]
    );
    
    console.log('🔎 Resultado da query de verificação:', rows);
    
    if (rows.length === 0) {
      console.log('❌ Nenhum código válido encontrado. Possíveis causas:');
      console.log('- Código digitado incorretamente');
      console.log('- Código já foi usado');
      console.log('- Código expirado');
      console.log('- Problema na inserção inicial');
      return false;
    }
    
    if (rows[0].is_not_expired !== 1) {
      console.log('⌛ Código expirado!');
      console.log(`⏳ Expiração: ${rows[0].expires_at}`);
      console.log(`⏰ Hora atual no banco: ${rows[0].db_time}`);
    }
    
    await connection.beginTransaction();
    await connection.query(
      'UPDATE access_codes SET used = 1 WHERE id = ?',
      [rows[0].id]
    );
    await connection.commit();
    
    console.log('✅ Código validado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    throw error;
  } finally {
    if (connection && !connection._freed) connection.release();
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
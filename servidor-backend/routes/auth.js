const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Rota de LOGIN
router.post('/login', async (req, res) => {
  try {
    const { user, pass } = req.body;
    
    if (!user || !pass) {
      return res.status(400).json({ 
        ok: false, 
        errors: ['Preencha todos os campos'] 
      });
    }

    const userData = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM users WHERE email = ? OR name = ?`,
        [user, user],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!userData) {
      return res.status(401).json({ 
        ok: false, 
        errors: ['Credenciais inválidas'] 
      });
    }

    if (pass !== userData.password) {
      return res.status(401).json({ 
        ok: false, 
        errors: ['Credenciais inválidas'] 
      });
    }

    res.json({ 
      ok: true, 
      redirect: '/chat', 
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ 
      ok: false, 
      errors: ['Erro interno no servidor'] 
    });
  }
});

// Rota de REGISTRO
router.post('/register', async (req, res) => {
  try {
    const { name, email, cpf, password } = req.body;
    
    console.log('Tentativa de registro:', { name, email, cpf });
    
    if (!name || !email || !cpf || !password) {
      return res.status(400).json({ 
        ok: false, 
        errors: ['Todos os campos são obrigatórios'] 
      });
    }

    const userExists = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM users WHERE email = ? OR cpf = ?`,
        [email, cpf],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (userExists) {
      return res.status(409).json({ 
        ok: false, 
        errors: ['E-mail ou CPF já cadastrado'] 
      });
    }

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (name, email, cpf, password) VALUES (?, ?, ?, ?)`,
        [name, email, cpf, password],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    res.status(201).json({ 
      ok: true, 
      message: 'Usuário registrado com sucesso', 
      userId: result 
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ 
        ok: false, 
        errors: ['E-mail ou CPF já cadastrado'] 
      });
    }
    
    res.status(500).json({ 
      ok: false, 
      errors: ['Erro interno no servidor'] 
    });
  }
});

// Rota de recuperação de senha
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        ok: false,
        errors: ['Informe um e-mail válido']
      });
    }

    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM users WHERE email = ?`,
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.json({ 
        ok: true, 
        message: 'Se o e-mail estiver cadastrado, você receberá instruções em breve.' 
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 1000 * 60 * 30; // 30 minutos

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)`,
        [email, token, expiresAt],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const resetUrl = `http://localhost:21465/redefinir-senha.html?token=${token}`;

    const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'reallblackboss@gmail.com',
      pass: 'zqyr snmn zltl hvxf' // <- Coloque sua senha real ou App Password do Gmail
    }
  });

    await transporter.sendMail({
      from: '"RealBlackBoss CRM" <no-reply@realblackboss.com>',
      to: email,
      subject: 'Redefinição de Senha - RealBlackBoss CRM',
      html: `
        <h2>Recuperação de Senha</h2>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta RealBlackBoss CRM.</p>
        <p>Clique no link abaixo para criar uma nova senha (válido por 30 minutos):</p>
        <p><a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #764ba2; color: white; text-decoration: none; border-radius: 5px;">Redefinir Senha</a></p>
        <p>Se você não solicitou isso, ignore este e-mail.</p>
        <br/>
        <p><strong>Equipe RealBlackBoss CRM</strong></p>
        <p><small>Este é um e-mail automático, por favor não responda.</small></p>
      `
    });

    return res.json({ 
      ok: true, 
      message: 'Se o e-mail estiver cadastrado, você receberá instruções em breve.' 
    });
    
  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    return res.status(500).json({
      ok: false,
      errors: ['Erro ao processar solicitação. Tente novamente mais tarde.']
    });
  }
});

// Rota para resetar a senha (NOVA)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    // Validações
    const errors = [];
    if (!token) errors.push('Token inválido');
    if (!password) errors.push('Senha é obrigatória');
    if (password && password.length < 8) errors.push('A senha deve ter pelo menos 8 caracteres');
    
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, errors });
    }

    // Busca o token no banco
    const resetRequest = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM password_resets WHERE token = ?`,
        [token],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!resetRequest) {
      return res.status(400).json({ 
        ok: false, 
        errors: ['Token inválido ou expirado.'] 
      });
    }

    // Verifica expiração
    if (Date.now() > resetRequest.expires_at) {
      // Limpa tokens expirados
      db.run(`DELETE FROM password_resets WHERE token = ?`, [token]);
      return res.status(400).json({ 
        ok: false, 
        errors: ['Token expirado. Solicite novamente.'] 
      });
    }

    // Atualiza senha do usuário
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET password = ? WHERE email = ?`,
        [password, resetRequest.email],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Remove o token usado
    await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM password_resets WHERE token = ?`, 
        [token], 
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return res.json({ 
      ok: true, 
      message: 'Senha redefinida com sucesso!' 
    });
  } catch (error) {
    console.error('Erro no reset de senha:', error);
    return res.status(500).json({ 
      ok: false, 
      errors: ['Erro interno no servidor'] 
    });
  }
});

module.exports = router;
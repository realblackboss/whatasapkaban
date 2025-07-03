const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho absoluto para o banco de dados
const dbPath = path.resolve(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite em', dbPath);
  }
});

// Função para adicionar colunas se não existirem
const addColumnIfNotExists = (table, column, type) => {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
      if (err) return reject(err);
      
      const columnExists = rows.some(col => col.name === column);
      
      if (!columnExists) {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (alterErr) => {
          if (alterErr) reject(alterErr);
          else {
            console.log(`Coluna '${column}' adicionada à tabela '${table}'`);
            resolve();
          }
        });
      } else {
        console.log(`Coluna '${column}' já existe na tabela '${table}'`);
        resolve();
      }
    });
  });
};

// Serialização das operações do banco de dados
db.serialize(async () => {
  await new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        cpf TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) reject(err);
      else {
        console.log('Tabela "users" verificada/criada com sucesso');
        resolve();
      }
    });
  });

  await new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `, (err) => {
      if (err) reject(err);
      else {
        console.log('Tabela "password_resets" verificada/criada com sucesso');
        resolve();
      }
    });
  });

  try {
    await addColumnIfNotExists('users', 'reset_token', 'TEXT');
    await addColumnIfNotExists('users', 'reset_expires', 'DATETIME');
    console.log('Verificação de colunas concluída');
  } catch (err) {
    console.error('Erro ao atualizar colunas:', err.message);
  }
});

module.exports = db;
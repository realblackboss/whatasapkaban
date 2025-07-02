const express = require('express');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 21465;

// Middlewares
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Configurar CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
  next();
});

// *** CORREÇÃO AQUI: caminho da pasta pública ***
const publicPath = path.join(__dirname, 'Public'); // Use o nome exato da pasta
app.use(express.static(publicPath));

// Rotas de API
app.use('/api', authRoutes);

// Rotas para páginas (*** CORRIGIDAS ***)
app.get('/', (req, res) => res.sendFile(path.join(publicPath, 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(publicPath, 'login.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(publicPath, 'cadastro.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(publicPath, 'chat.html')));
app.get('/redefinir-senha', (req, res) => res.sendFile(path.join(publicPath, 'redifinir-senha.html'))); // Nome corrigido

// Rota administrativa (mantida igual)
app.get('/admin/view-password/:id', async (req, res) => { /* ... */ });

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
  =====================================================
  🚀 Servidor iniciado na porta ${PORT}
  ⏰ ${new Date().toLocaleString()}
  =====================================================
  `);
});
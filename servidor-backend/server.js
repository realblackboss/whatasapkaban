const express = require('express');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 21465;

// Middlewares
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Logs
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
  next();
});

// ✅ CAMINHO CORRETO DOS HTMLs
const publicPath = path.join(__dirname, 'Public'); // AJUSTADO
app.use(express.static(publicPath));

// ✅ ROTAS HTML
app.get('/', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(publicPath, 'cadastro.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(publicPath, 'chat.html')));
app.get('/redefinir-senha', (req, res) => res.sendFile(path.join(publicPath, 'redefinir-senha.html'))); // CORRIGIDO

// Rotas da API
app.use('/api', authRoutes);

// Rota admin
app.get('/admin/view-password/:id', async (req, res) => {
  // ...
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
  =====================================================
  🚀 Servidor iniciado na porta ${PORT}
  ⏰ ${new Date().toLocaleString()}
  =====================================================
  `);
});

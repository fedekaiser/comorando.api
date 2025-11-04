// server.js
const express = require('express');
const path = require('path');
const app = express();

// Puerto asignado por Render o 10000 en desarrollo
const PORT = process.env.PORT || 10000;

// Servir archivos estáticos con cache control ligero
app.use(express.static(path.join(__dirname, '.'), {
  maxAge: '1h', // cache de 1 hora para assets
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Rutas explícitas para páginas HTML
const htmlRoutes = [
  '/',
  '/premium',
  '/disclaimer',
  '/privacy',
  '/terms',
  '/cookies',
  '/auth/login'
];

htmlRoutes.forEach(route => {
  app.get(route, (req, res) => {
    let file;
    if (route === '/') {
      file = 'index.html';
    } else if (route.startsWith('/auth/')) {
      file = `auth/${route.split('/auth/')[1]}.html`;
    } else {
      file = `${route.substring(1)}.html`;
    }
    const filePath = path.join(__dirname, file);
    res.sendFile(filePath, err => {
      if (err) {
        console.error(`Error sirviendo ${file}:`, err);
        res.status(404).send('Página no encontrada');
      }
    });
  });
});

// Cualquier otra ruta → index.html (útil si usas enlaces directos o SEO)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor activo en puerto ${PORT}`);
  console.log(`📍 Accede en: http://localhost:${PORT}`);
});

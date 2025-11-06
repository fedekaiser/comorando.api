// server.js
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Usa la clave API desde variable de entorno
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '.'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Ruta dinámica para informes de YouTube
app.get('/tool/report', async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).send(`
      <h2>❌ Error</h2>
      <p>Falta el parámetro <code>username</code>.</p>
      <a href="/">← Volver al inicio</a>
    `);
  }

  if (!YOUTUBE_API_KEY) {
    return res.status(500).send(`
      <h2>⚙️ API no configurada</h2>
      <p>La clave de YouTube no está disponible en el servidor.</p>
      <a href="/">← Volver al inicio</a>
    `);
  }

  try {
    // Buscar canal
    const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        type: 'channel',
        q: username,
        key: YOUTUBE_API_KEY,
        maxResults: 1
      }
    });

    const items = searchRes.data.items;
    if (!items || items.length === 0) {
      return res.status(404).send(`
        <h2>🔍 Canal no encontrado</h2>
        <p>No se encontró un canal público con el nombre: <strong>${username}</strong></p>
        <a href="/">← Volver al inicio</a>
      `);
    }

    const channelId = items[0].snippet.channelId;

    // Obtener estadísticas
    const statsRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet,statistics',
        id: channelId,
        key: YOUTUBE_API_KEY
      }
    });

    const channel = statsRes.data.items[0];
    if (!channel) throw new Error('Canal no disponible');

    const stats = channel.statistics;
    const snippet = channel.snippet;

    const formatNumber = (num) => {
      const n = parseInt(num);
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
      if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
      return n.toLocaleString();
    };

    const data = {
      title: snippet.title,
      subscribers: formatNumber(stats.subscriberCount || 0),
      views: formatNumber(stats.viewCount || 0),
      videoCount: formatNumber(stats.videoCount || 0),
      country: snippet.country || 'No público',
      thumbnail: snippet.thumbnails.high?.url || '/assets/images/default-channel.png'
    };

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.title} – Comorando</title>
      <link rel="icon" href="/assets/images/favicon.ico" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 0; }
        header { background: white; padding: 1rem 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .logo { font-weight: 800; font-size: 1.5rem; background: linear-gradient(135deg, #8b5cf6, #ec4899); -webkit-background-clip: text; color: transparent; }
        .container { max-width: 800px; margin: 2rem auto; padding: 0 1.5rem; }
        .hero { text-align: center; margin: 2rem 0; }
        .hero img { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 1.5rem; }
        .hero h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1.2rem; margin: 2rem 0; }
        .metric-card { background: white; padding: 1.4rem; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; }
        .metric-value { font-size: 1.7rem; font-weight: 700; color: #8b5cf6; }
        .metric-label { color: #64748b; font-size: 0.95rem; }
        .note { background: #f1f5f9; padding: 1.4rem; border-radius: 16px; margin: 2rem 0; font-size: 0.95rem; }
        footer { text-align: center; margin-top: 3rem; color: #94a3b8; font-size: 0.9rem; }
        a { color: #8b5cf6; text-decoration: none; }
      </style>
    </head>
    <body>
      <header><div class="logo">comorando</div></header>
      <div class="container">
        <div class="hero">
          <img src="${data.thumbnail}" alt="${data.title}" onerror="this.src='/assets/images/default-channel.png'">
          <h1>${data.title}</h1>
          <p>Categoría: Creador de contenido • País: ${data.country}</p>
        </div>
        <div class="metrics">
          <div class="metric-card"><div class="metric-value">${data.subscribers}</div><div class="metric-label">Suscriptores</div></div>
          <div class="metric-card"><div class="metric-value">${data.views}</div><div class="metric-label">Vistas totales</div></div>
          <div class="metric-card"><div class="metric-value">${data.videoCount}</div><div class="metric-label">Videos públicos</div></div>
        </div>
        <div class="note">
          <p><strong>📌 Transparencia total:</strong> Estos datos son públicos y provienen de la API oficial de YouTube. 
          <strong>Comorando no muestra ni estima ingresos</strong>, ya que no son datos accesibles públicamente.</p>
        </div>
        <footer>
          <p>© 2025 Comorando. Datos reales. Cero suposiciones.</p>
          <p><a href="/">← Volver al inicio</a></p>
        </footer>
      </div>
    </body>
    </html>
    `;
    res.send(html);

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send(`
      <h2>⚠️ No se pudieron cargar los datos</h2>
      <p>El canal <strong>${username}</strong> podría ser privado o inexistente.</p>
      <a href="/">← Volver al inicio</a>
    `);
  }
});

// Fallback a index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor activo en puerto ${PORT}`);
});

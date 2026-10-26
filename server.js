/**
 * server.js
 * Express Full-Stack Server for ScholarChain
 * Provides REST API with JWT Auth, Role-based Routing, and Ganache RPC Proxy
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');

const authRoutes = require('./routes/auth');
const blockchainRoutes = require('./routes/blockchain');

const app = express();
const PORT = process.env.PORT || 5000;
const GANACHE_PORT = 7545;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// RPC Proxy: allows browser to connect to Ganache via /api/rpc without any CORS or cross-port issues
app.post('/api/rpc', (req, res) => {
  const payload = JSON.stringify(req.body);
  const clientReq = http.request(
    {
      hostname: '127.0.0.1',
      port: GANACHE_PORT,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    },
    (clientRes) => {
      res.writeHead(clientRes.statusCode, clientRes.headers);
      clientRes.pipe(res);
    }
  );

  clientReq.on('error', (err) => {
    res.status(502).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32603, message: 'Ganache RPC Proxy Error: ' + err.message }
    });
  });

  clientReq.write(payload);
  clientReq.end();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/blockchain', blockchainRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'ScholarChain Full-Stack System',
    timestamp: new Date().toISOString(),
    network: `http://127.0.0.1:${GANACHE_PORT}`,
    rpcProxy: '/api/rpc'
  });
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Root route: serves ScholarChain.html
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'ScholarChain.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.send('ScholarChain Portal is running. ScholarChain.html not found.');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`🎓 ScholarChain Full-Stack Server running at http://localhost:${PORT}`);
  console.log(`⛓️  Connected to Ganache Node at http://127.0.0.1:${GANACHE_PORT}`);
  console.log(`🌐 Same-Origin RPC Proxy available at http://localhost:${PORT}/api/rpc`);
  console.log('🔐 Authentication & Role Management: ACTIVE');
  console.log('══════════════════════════════════════════════════════════════');
});

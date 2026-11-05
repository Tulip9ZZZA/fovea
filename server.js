// server.js — Fovea's server. Static app + demo pages + same-origin audit proxy +
// corpus summary API. One dependency (express), no environment variables, no keys.

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { handleProxy } from './lib/proxy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.disable('x-powered-by');

app.use(express.static(path.join(__dirname, 'src'), { maxAge: '1h' }));
app.use('/demo', express.static(path.join(__dirname, 'demo'), { maxAge: '1h' }));
app.use('/engine', express.static(path.join(__dirname, 'src', 'engine'), { maxAge: '1h' }));

app.get('/proxy', (req, res) => {
  const target = String(req.query.url || '');
  if (!target) return res.status(400).send('missing ?url=');
  handleProxy(req, res, target).catch(() => {
    if (!res.headersSent) res.status(502).send('proxy failure');
  });
});

// Corpus summary for the batch report (produced by `npm run crawl`).
app.get('/api/corpus/summary', (req, res) => {
  const p = path.join(__dirname, 'data', 'corpus', 'summary.json');
  if (!fs.existsSync(p)) {
    return res.status(404).json({ error: 'corpus-not-crawled', hint: 'npm run crawl' });
  }
  res.sendFile(p);
});

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'fovea' }));

app.listen(PORT, () => {
  console.log(`Fovea running → http://localhost:${PORT}`);
});

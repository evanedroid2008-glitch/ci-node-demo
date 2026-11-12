const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const port = Number(process.env.PORT || 3000);
const pagePath = path.join(__dirname, 'dist', 'index.html');
const databaseUrl = process.env.DATABASE_URL;
const databaseConfigured = Boolean(databaseUrl || process.env.PGHOST);
const pool = databaseConfigured
  ? new Pool({
      ...(databaseUrl ? { connectionString: databaseUrl } : {}),
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 30000,
      max: 5,
    })
  : null;

let databaseStatus = pool ? 'connecting' : 'disabled';

if (pool) {
  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', database: databaseStatus }));
    return;
  }

  if (req.url === '/api/db') {
    if (!pool) {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'disabled', message: 'PostgreSQL environment variables are not configured.' }));
      return;
    }

    try {
      const result = await pool.query('SELECT CURRENT_TIMESTAMP AS connected_at');
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: databaseStatus, connected_at: result.rows[0].connected_at }));
    } catch (error) {
      res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'error', message: 'Database query failed.' }));
    }
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    if (!fs.existsSync(pagePath)) {
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Build output not found. Run npm run build.');
      return;
    }

    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(pagePath));
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function connectToDatabase() {
  if (!pool) {
    console.log('PostgreSQL environment variables are not set; integration is disabled.');
    return;
  }

  const maxAttempts = 15;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      databaseStatus = 'connected';
      console.log('PostgreSQL connection successful.');
      return;
    } catch (error) {
      console.error(`PostgreSQL connection attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      if (attempt === maxAttempts) {
        throw error;
      }
      await delay(2000);
    }
  }
}

async function start() {
  await connectToDatabase();
  server.listen(port, '0.0.0.0', () => {
    console.log(`ci-node-demo listening on port ${port}`);
  });
}

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down.`);
  server.close(async () => {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch(async (error) => {
  console.error('Application startup failed:', error.message);
  if (pool) {
    await pool.end();
  }
  process.exit(1);
});

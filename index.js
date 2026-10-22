const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.env.PORT || 3000);
const pagePath = path.join(__dirname, 'dist', 'index.html');

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('ok');
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

server.listen(port, '0.0.0.0', () => {
  console.log(`ci-node-demo listening on port ${port}`);
});

const fs = require('node:fs');
const path = require('node:path');

const distDir = path.join(__dirname, '..', 'dist');
fs.mkdirSync(distDir, { recursive: true });

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dockerized Node.js CI/CD demo</title>
  <style>
    body { font: 18px system-ui, sans-serif; max-width: 720px; margin: 12vh auto; padding: 0 24px; color: #20252b; }
    h1 { color: #176b55; }
    .status { display: inline-block; padding: 8px 12px; border-radius: 8px; background: #e2f4eb; }
  </style>
</head>
<body>
  <p class="status">Deployment successful</p>
  <h1>Hello from Node CI/CD!</h1>
  <p>This Node.js service runs in Docker and can use PostgreSQL through Docker Compose.</p>
  <p>Check the live PostgreSQL connection at <code>/api/db</code>.</p>
  <p>Built at: ${new Date().toISOString()}</p>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
console.log('Build complete: dist/index.html');

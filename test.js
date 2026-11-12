const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const pagePath = path.join(__dirname, 'dist', 'index.html');
  assert.ok(fs.existsSync(pagePath), 'Build output dist/index.html should exist');
  const html = fs.readFileSync(pagePath, 'utf8');
  assert.match(html, /Hello from Node CI\/CD!/);
  assert.match(html, /Deployment successful/);
  assert.match(html, /\/api\/db/);
  console.log('Build output tests passed.');

  const port = 36000 + Math.floor(Math.random() * 2000);
  const app = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: '',
      PGHOST: '',
      PGPORT: '',
      PGUSER: '',
      PGPASSWORD: '',
      PGDATABASE: '',
    },
    stdio: 'ignore',
  });

  try {
    let health = null;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (app.exitCode !== null) {
        throw new Error(`Application exited early with code ${app.exitCode}`);
      }
      try {
        const response = await fetch(`http://127.0.0.1:${port}/healthz`);
        if (response.ok) {
          health = await response.json();
          break;
        }
      } catch {
        // The listener may need a moment to start.
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    assert.ok(health, 'Application health endpoint should become available');
    assert.equal(health.status, 'ok');
    assert.equal(health.database, 'disabled');

    const dbResponse = await fetch(`http://127.0.0.1:${port}/api/db`);
    assert.equal(dbResponse.status, 200);
    const dbStatus = await dbResponse.json();
    assert.equal(dbStatus.status, 'disabled');
    console.log('HTTP smoke tests passed.');
  } finally {
    if (app.exitCode === null) {
      app.kill('SIGTERM');
      await new Promise((resolve) => app.once('exit', resolve));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

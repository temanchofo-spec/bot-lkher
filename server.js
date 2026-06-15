const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const app = express();

const PORT = 5000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let botProcess = null;
let botStatus = 'stopped';
let botLogs = [];

function startBot() {
  if (botProcess) return;
  botStatus = 'starting';
  botLogs = [];

  botProcess = spawn('node', ['-r', './preload.js', 'index.js'], {
    env: { ...process.env, NODE_ENV: 'production' },
    cwd: __dirname,
  });

  botProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    botLogs = [...botLogs, ...lines].slice(-100);
    lines.forEach(l => console.log('[BOT]', l));
    if (botLogs.some(l => l.includes('BOT_STARTED') || l.includes('UPTIME') || l.includes('online'))) {
      botStatus = 'running';
    }
  });

  botProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    botLogs = [...botLogs, ...lines].slice(-100);
    lines.forEach(l => console.error('[BOT ERR]', l));
  });

  botProcess.on('close', (code) => {
    botStatus = code === 0 ? 'stopped' : 'error';
    botProcess = null;
  });
}

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NERO Bot V2 - Control Panel</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; min-height: 100vh; }
    .header { background: linear-gradient(135deg, #1a1f2e, #0d1117); border-bottom: 1px solid #30363d; padding: 20px 40px; display: flex; align-items: center; gap: 16px; }
    .logo { font-size: 28px; font-weight: 800; background: linear-gradient(90deg, #58a6ff, #bc8cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .version { background: #21262d; border: 1px solid #30363d; border-radius: 12px; padding: 4px 10px; font-size: 12px; color: #8b949e; }
    .container { max-width: 900px; margin: 40px auto; padding: 0 20px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .card h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #f0f6fc; display: flex; align-items: center; gap: 8px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .status-running { background: #0d2b1f; color: #3fb950; border: 1px solid #238636; }
    .status-stopped { background: #2d1b1b; color: #f85149; border: 1px solid #6e2424; }
    .status-starting { background: #2d2400; color: #e3b341; border: 1px solid #9e6a03; }
    .status-error { background: #2d1b1b; color: #f85149; border: 1px solid #6e2424; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
    .btn-primary { background: #238636; color: white; }
    .btn-primary:hover { background: #2ea043; }
    .btn-danger { background: #6e2424; color: #f85149; border: 1px solid #6e2424; }
    .btn-danger:hover { background: #8a2c2c; }
    .btn-row { display: flex; gap: 10px; }
    .logs { background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 12px; height: 250px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; color: #8b949e; }
    .setup-steps { list-style: none; counter-reset: steps; }
    .setup-steps li { counter-increment: steps; padding: 12px 0; border-bottom: 1px solid #21262d; display: flex; align-items: flex-start; gap: 12px; }
    .setup-steps li:last-child { border-bottom: none; }
    .step-num { background: #1f6feb; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; margin-top: 2px; }
    .step-text { color: #c9d1d9; line-height: 1.6; }
    .step-text code { background: #21262d; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #79c0ff; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-item label { display: block; font-size: 11px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .info-item span { font-size: 14px; color: #f0f6fc; font-weight: 500; }
    @media (max-width: 600px) { .info-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">NERO Bot</div>
    <div class="version">v2.5</div>
  </div>
  <div class="container">
    <div class="card">
      <h2>⚡ Bot Status</h2>
      <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
        <span class="status-badge status-${botStatus}">
          <span class="dot"></span>
          ${botStatus.charAt(0).toUpperCase() + botStatus.slice(1)}
        </span>
        <div class="btn-row">
          <form method="POST" action="/start" style="display:inline">
            <button class="btn btn-primary" type="submit">▶ Start Bot</button>
          </form>
          <form method="POST" action="/stop" style="display:inline">
            <button class="btn btn-danger" type="submit">■ Stop Bot</button>
          </form>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>📋 Recent Logs</h2>
      <div class="logs" id="logs">${botLogs.length ? botLogs.join('\n') : 'No logs yet. Start the bot to see output here.'}</div>
    </div>

    <div class="card">
      <h2>🚀 Setup Guide</h2>
      <ul class="setup-steps">
        <li>
          <div class="step-num">1</div>
          <div class="step-text">Get your Facebook account's <strong>appstate/cookie</strong> using a browser extension like <em>c3c-fbstate</em> or <em>Get cookies.txt</em>. This is required for the bot to login.</div>
        </li>
        <li>
          <div class="step-num">2</div>
          <div class="step-text">Paste the appstate JSON into <code>account.txt</code> in the project root.</div>
        </li>
        <li>
          <div class="step-num">3</div>
          <div class="step-text">Configure <code>config.json</code> — set your <code>adminBot</code> Facebook UID, choose a <code>prefix</code>, and optionally set your <code>email</code> and <code>password</code> for auto cookie refresh.</div>
        </li>
        <li>
          <div class="step-num">4</div>
          <div class="step-text">Click <strong>Start Bot</strong> above to launch the bot. Check the logs for any errors.</div>
        </li>
      </ul>
    </div>

    <div class="card">
      <h2>ℹ️ Project Info</h2>
      <div class="info-grid">
        <div class="info-item"><label>Project</label><span>NERO Bot V2.5</span></div>
        <div class="info-item"><label>Author</label><span>SIFO ANTER Nero</span></div>
        <div class="info-item"><label>Language</label><span>Node.js</span></div>
        <div class="info-item"><label>Database</label><span>SQLite (default)</span></div>
        <div class="info-item"><label>Prefix</label><span>/</span></div>
        <div class="info-item"><label>Platform</label><span>Facebook Messenger</span></div>
      </div>
    </div>
  </div>
  <script>
    setInterval(() => fetch('/logs').then(r=>r.json()).then(d=>{
      const el = document.getElementById('logs');
      if (d.logs && d.logs.length) {
        el.textContent = d.logs.join('\\n');
        el.scrollTop = el.scrollHeight;
      }
    }), 2000);
  </script>
</body>
</html>`);
});

app.post('/start', (req, res) => {
  if (!botProcess) startBot();
  res.redirect('/');
});

app.post('/stop', (req, res) => {
  if (botProcess) {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botStatus = 'stopped';
  }
  res.redirect('/');
});

app.get('/logs', (req, res) => {
  res.json({ logs: botLogs, status: botStatus });
});

app.get('/uptime', (req, res) => {
  res.json({ status: 'ok', message: 'Server is online' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NERO Bot Control Panel running at http://0.0.0.0:${PORT}`);

  if (process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production') {
    console.log('[DEPLOYMENT] Auto-starting NERO bot...');
    startBot();
  }
});

if (process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production') {
  setInterval(() => {
    if (!botProcess && botStatus !== 'starting') {
      console.log('[KEEPALIVE] Bot process not running — restarting...');
      startBot();
    }
  }, 60000);
}

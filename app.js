const axios = require('axios');
const express = require('express');
const app = express();
const path = require('path');

const { config } = global.NeroBot;
const { log, getText } = global.utils;

if (global.timeOutUptime != undefined) clearTimeout(global.timeOutUptime);
if (!config.autoUptime.enable) return;

const PORT =
  config.dashBoard?.port ||
  (!isNaN(config.serverUptime.port) && config.serverUptime.port) ||
  3001;

let myUrl =
  config.autoUptime.url ||
  `https://${
    process.env.REPL_OWNER
      ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : process.env.API_SERVER_EXTERNAL == 'https://api.glitch.com'
      ? `${process.env.PROJECT_DOMAIN}.glitch.me`
      : `localhost:${PORT}`
  }`;

myUrl.includes('localhost') && (myUrl = myUrl.replace('https', 'http'));
myUrl += '/uptime';

// -------- إعداد الموقع الصغير --------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let customUrls = [myUrl]; // قائمة الروابط التي يتم عمل Uptime لها

// صفحة HTML بسيطة
app.get('/', (req, res) => {
  const html = `
    <html>
    <head>
      <title>Bot Uptime Manager</title>
      <style>
        body { font-family: sans-serif; background: #111; color: #eee; text-align: center; padding: 40px; }
        h1 { color: #4caf50; }
        input, button { padding: 8px 12px; margin: 6px; border-radius: 6px; border: none; }
        input { width: 250px; }
        button { background: #4caf50; color: white; cursor: pointer; }
        .list { margin-top: 20px; text-align: left; display: inline-block; }
      </style>
    </head>
    <body>
      <h1>🚀 Uptime Monitor</h1>
      <p>أضف رابط جديد ليتم مراقبته تلقائيًا:</p>
      <form method="POST" action="/add">
        <input type="url" name="url" placeholder="https://example.com/uptime" required />
        <button type="submit">إضافة</button>
      </form>
      <div class="list">
        <h3>الروابط المراقبة:</h3>
        <ul>
          ${customUrls.map(u => `<li>${u}</li>`).join('')}
        </ul>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

// إضافة رابط جديد
app.post('/add', (req, res) => {
  const { url } = req.body;
  if (!url) return res.send('❌ لم يتم إدخال رابط');
  if (!customUrls.includes(url)) customUrls.push(url);
  res.redirect('/');
});

// endpoint uptime
app.get('/uptime', (req, res) => {
  res.json({ status: 'ok', message: 'Bot is online ✅' });
});

app.listen(PORT, '0.0.0.0', () => {
  log.info('DASHBOARD', `🌐 Running at http://0.0.0.0:${PORT}`);
});

// -------- نظام الـ Auto Uptime --------
let status = 'ok';

setTimeout(async function autoUptime() {
  for (const link of customUrls) {
    try {
      await axios.get(link);
      if (status != 'ok') {
        status = 'ok';
        log.info('UPTIME', 'Bot is online');
      }
    } catch (e) {
      const err = e.response?.data || e;
      if (status != 'ok') return;
      status = 'failed';

      if (err.statusAccountBot == "can't login") {
        log.err('UPTIME', "Can't login account bot");
      } else if (err.statusAccountBot == 'block spam') {
        log.err('UPTIME', 'Your account is blocked');
      }
    }
  }

  global.timeOutUptime = setInterval(
    autoUptime,
    config.autoUptime.timeInterval || 180000
  );
}, (config.autoUptime.timeInterval || 180) * 1000);

log.info('AUTO UPTIME', getText('autoUptime', 'autoUptimeTurnedOn', myUrl));

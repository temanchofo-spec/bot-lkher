const https = require('https');
const http = require('http');
const { EventEmitter } = require('events');
const { Readable } = require('stream');

// ── 1. Open port 5000 immediately so Replit's health check passes ──────────
// Skip if already managed by server.js (child process mode) or production
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  const _earlyServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('NERO Bot is starting...');
  });
  _earlyServer.listen(5000, '0.0.0.0', () => {
    console.log('[PRELOAD] Early server listening on port 5000');
  });
}

// ── 2. Intercept the deleted GitHub resource (returns 404 → mock 200) ──────
const MOCK_BODY = '<html><body>OK</body></html>';

function makeMock(callback) {
  const res = new Readable({ read() {} });
  res.statusCode = 200;
  res.statusMessage = 'OK';
  res.headers = { 'content-type': 'text/html', 'content-length': String(Buffer.byteLength(MOCK_BODY)) };
  res.rawHeaders = [];

  const req = new EventEmitter();
  req.write = () => req;
  req.setTimeout = () => req;
  req.abort = () => {};
  req.destroy = () => {};
  req.flushHeaders = () => {};
  req.end = function() {
    setImmediate(() => {
      if (typeof callback === 'function') callback(res);
      req.emit('response', res);
      res.push(Buffer.from(MOCK_BODY));
      res.push(null);
    });
    return req;
  };
  return req;
}

const orig = https.request;
https.request = function(options, callback) {
  const host = (typeof options === 'object' ? options.hostname || options.host : '') || '';
  const path = (typeof options === 'object' ? options.path : '') || '';
  const combined = host + path;
  if (combined.includes('Nero-NEROBOT') || combined.includes('ntkhang03')) {
    console.log('[PRELOAD] Mocking:', combined.slice(0, 80));
    return makeMock(callback);
  }
  return orig.apply(this, arguments);
};

console.log('[PRELOAD] Loaded. https.request patched. typeof https.request:', typeof https.request);

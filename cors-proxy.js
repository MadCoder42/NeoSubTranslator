// cors-proxy.js
// A tiny, dependency-free CORS-adding reverse proxy for local OpenAI-compatible
// routers (like 9router) that don't send CORS headers to browser clients.
//
// It also answers Chrome's Private Network Access (PNA) preflight, which is
// separate from ordinary CORS and is required whenever a page fetches
// something on localhost/127.0.0.1 — Chrome expects an
// "Access-Control-Allow-Private-Network: true" header on the preflight
// response, which most local tools (including 9router) don't send.
//
// Usage:
//   node cors-proxy.js
// Then in NeoSubTranslator, set your Custom endpoint to:
//   http://localhost:8010/v1
// instead of 9router's own http://localhost:20128/v1
//
// Edit TARGET_PORT below if your router runs on a different port.

const http = require('http');

const TARGET_HOST = 'localhost';
const TARGET_PORT = 20128; // 9router's default port
const LISTEN_PORT = 8010;  // NeoSubTranslator will point at this port instead

const server = http.createServer((req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || 'Content-Type, Authorization',
    'Access-Control-Allow-Private-Network': 'true',
    'Access-Control-Max-Age': '86400'
  };

  // Answer preflight requests ourselves — this is the exact step 9router's
  // own auth middleware currently blocks, so we short-circuit it here.
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const proxyReq = http.request(
    { host: TARGET_HOST, port: TARGET_PORT, path: req.url, method: req.method, headers: req.headers },
    (proxyRes) => {
      // 9router sends its own Access-Control-* headers on real responses
      // (just not on the OPTIONS preflight, which is the actual bug we're
      // working around). If we don't strip those first, the browser sees
      // two Access-Control-Allow-Origin headers and rejects the response
      // as invalid, even though both values are "*".
      const forwardedHeaders = { ...proxyRes.headers };
      Object.keys(forwardedHeaders).forEach((k) => {
        if (/^access-control-/i.test(k)) delete forwardedHeaders[k];
      });
      res.writeHead(proxyRes.statusCode, { ...forwardedHeaders, ...corsHeaders });
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (e) => {
    res.writeHead(502, corsHeaders);
    res.end('Proxy error reaching ' + TARGET_HOST + ':' + TARGET_PORT + ' — ' + e.message);
  });

  req.pipe(proxyReq);
});

server.listen(LISTEN_PORT, () => {
  console.log(`CORS proxy running at http://localhost:${LISTEN_PORT}`);
  console.log(`Forwarding to http://${TARGET_HOST}:${TARGET_PORT}`);
  console.log(`Point NeoSubTranslator's Custom endpoint at: http://localhost:${LISTEN_PORT}/v1`);
});

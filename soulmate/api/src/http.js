export function withCors(headers = {}) {
  return {
    ...headers,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token'
  };
}

// Admin/management routes must not be reachable cross-origin: they are
// same-origin only, so we deliberately omit the permissive CORS headers.
export function sendJson(res, statusCode, payload, { cors = true } = {}) {
  const body = statusCode === 204 ? '' : JSON.stringify(payload, null, 2);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  };
  res.writeHead(statusCode, cors ? withCors(headers) : headers);
  res.end(body);
}

export function sendSseHeaders(res) {
  res.writeHead(200, withCors({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  }));
  res.write(': connected\n\n');
}

export function writeSse(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function readJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = '';

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > maxBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

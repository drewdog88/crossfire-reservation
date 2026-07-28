export function sendJson(res, status, body) {
  res.status(status).json(body);
}

export function methodGuard(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    res.status(405).json({ error: 'Method not allowed' });
    return true;
  }
  return false;
}

export async function readBody(req) {
  if (typeof req.body === 'object' && req.body !== null) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return req.body ? JSON.parse(req.body) : {};
    } catch {
      return {};
    }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

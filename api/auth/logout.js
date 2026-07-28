import { sendJson, methodGuard } from '../_lib/http.js'
import { clearCookie } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (methodGuard(req, res, ['POST'])) return
  res.setHeader('Set-Cookie', clearCookie())
  sendJson(res, 200, { ok: true })
}

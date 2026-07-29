import { sendJson, methodGuard, readBody } from '../_lib/http.js'
import { requireAdmin } from '../_lib/auth.js'

// Server-side Nominatim proxy so the OSM User-Agent policy is honored and the
// browser never hits Nominatim cross-origin. Admin-gated; geocoding is a
// one-time operation performed when an admin saves a location's address.
export default async function handler(req, res) {
  if (methodGuard(req, res, ['POST'])) return
  if (!requireAdmin(req, res)) return
  const body = await readBody(req)
  const address = body?.address
  if (!address || typeof address !== 'string') {
    return sendJson(res, 400, { error: 'Missing address' })
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'crossfire-reservation/1.0 (coach@crossfireselect.com)' },
    })
    const results = await resp.json()
    if (!Array.isArray(results) || results.length === 0) {
      return sendJson(res, 404, { error: 'Address not found' })
    }
    return sendJson(res, 200, { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) })
  } catch (err) {
    console.error('geocode error', err)
    return sendJson(res, 500, { error: 'Geocoding failed' })
  }
}

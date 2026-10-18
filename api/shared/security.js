const crypto = require('crypto')

// ─────────────────────────────────────────────
// hCaptcha verification
// Set HCAPTCHA_SECRET in Azure Portal → Static Web App → Environment variables.
// If it's not set, checks are skipped (with a warning) so forms keep working
// until the key is configured.
// ─────────────────────────────────────────────
async function verifyCaptcha(token, request) {
  const secret = process.env.HCAPTCHA_SECRET
  if (!secret) {
    console.warn('HCAPTCHA_SECRET is not set; skipping captcha check')
    return true
  }
  if (!token || typeof token !== 'string') return false
  const params = new URLSearchParams({ secret, response: token })
  const ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.split(':')[0]?.trim()
  if (ip) params.set('remoteip', ip)
  try {
    const res = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })
    const data = await res.json()
    return data.success === true
  } catch (err) {
    console.error('hCaptcha verify failed', err)
    return false
  }
}

const CAPTCHA_ERROR = { status: 400, jsonBody: { error: 'Please complete the captcha and try again.' } }

// ─────────────────────────────────────────────
// Report tickets: a new report (which passed the captcha) gets a short-lived
// signed ticket, which is what lets the browser upload that report's photo and
// generate its flyer. Signed with the storage key, so no extra secret is needed.
// ─────────────────────────────────────────────
const TICKET_TTL_MS = 30 * 60 * 1000

function sign(dogId, ts) {
  const key = process.env.AZURE_STORAGE_ACCOUNT_KEY || ''
  return crypto.createHmac('sha256', key).update(`report:${dogId}:${ts}`).digest('hex')
}

function makeTicket(dogId) {
  const ts = Date.now()
  return `${ts}.${sign(dogId, ts)}`
}

function checkTicket(dogId, ticket) {
  if (!dogId || !ticket || typeof ticket !== 'string') return false
  const [tsStr, sig] = ticket.split('.')
  const ts = Number(tsStr)
  if (!ts || !sig || Date.now() - ts > TICKET_TTL_MS) return false
  const expected = sign(dogId, ts)
  return sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

module.exports = { verifyCaptcha, CAPTCHA_ERROR, makeTicket, checkTicket }

const { SignJWT, jwtVerify } = require('jose');

const COOKIE_NAME = 'seo_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me');
}

// payload: { role: 'admin' } | { role: 'client', clientId, name }
async function createSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
}

async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}

// Works with a NextRequest (route handlers / middleware).
async function getSessionFromRequest(req) {
  return verifySession(req.cookies.get(COOKIE_NAME)?.value);
}

module.exports = { COOKIE_NAME, MAX_AGE, createSession, verifySession, getSessionFromRequest };

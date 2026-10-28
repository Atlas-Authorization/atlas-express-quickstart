// Atlas + Express quickstart.
//
// `atlasMiddleware` verifies the session JWT LOCALLY against the instance JWKS
// (cached in-process — a warm server makes no network call per request) and
// decorates `req.atlas`. Read it with `getAuth(req)`; gate a route with
// `requireAuth()`. There are NO Atlas endpoints called on the hot path.
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { atlasMiddleware, getAuth, requireAuth } from '@atlasauth/express';

const __dirname = dirname(fileURLToPath(import.meta.url));

const {
  ATLAS_JWKS_URL,
  ATLAS_ISSUER,
  ATLAS_PUBLISHABLE_KEY,
  ATLAS_FRONTEND_API = 'https://atlasauth.net',
  PORT = '3000',
} = process.env;

if (!ATLAS_JWKS_URL || !ATLAS_ISSUER) {
  console.error('Missing ATLAS_JWKS_URL / ATLAS_ISSUER — copy .env.example and fill them in.');
  process.exit(1);
}

const app = express();

// Run on every request. The middleware NEVER throws and NEVER blocks: a missing
// or invalid token simply leaves a signed-out `req.atlas`, so it is safe to
// `app.use()` globally.
app.use(
  atlasMiddleware({
    jwksUrl: ATLAS_JWKS_URL,
    issuer: ATLAS_ISSUER,
    publishableKey: ATLAS_PUBLISHABLE_KEY,
  }),
);

// Hand the publishable key + Frontend API origin to the static sign-in page.
app.get('/config.json', (_req, res) => {
  res.json({ publishableKey: ATLAS_PUBLISHABLE_KEY ?? '', frontendApi: ATLAS_FRONTEND_API });
});

// Public: reports who you are (or that you are signed out). No gate.
app.get('/api/me', (req, res) => {
  const { userId, sessionId, orgId, orgRole, isSignedIn } = getAuth(req);
  res.json({ isSignedIn, userId, sessionId, orgId, orgRole });
});

// Protected: `requireAuth()` responds 401 for a signed-out caller and never
// reaches the handler.
app.get('/api/protected', requireAuth(), (req, res) => {
  const { userId, has } = getAuth(req);
  res.json({
    message: `Hello, ${userId}. You reached a protected route.`,
    isAdmin: has({ role: 'admin' }),
  });
});

app.use(express.static(join(__dirname, '..', 'public')));

app.listen(Number(PORT), () => {
  console.log(`atlas-express-quickstart on http://localhost:${PORT}`);
});

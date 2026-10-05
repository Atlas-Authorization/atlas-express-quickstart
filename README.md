# atlas-express-quickstart

A minimal [Express](https://expressjs.com) API protected by
[Atlas](https://atlasauth.net) auth, plus a static sign-in page.

## What's wired

- **`src/server.js`** — `atlasMiddleware()` from `@atlasauth/express` verifies
  the session JWT **locally** against the instance JWKS (cached in-process, no
  network call on the hot path) and decorates `req.atlas`.
  - `GET /api/me` reads `getAuth(req)` — public, reports signed-in state.
  - `GET /api/protected` is gated by `requireAuth()` — 401 when signed out.
- **`public/` + `src/signin.js`** — a static sign-in page driving the Atlas
  Frontend API directly with the `@atlasauth/js` `FapiClient` + `initialFlow` /
  `advance` flow helpers (bundled by esbuild).

## Run

```sh
npm install
cp .env.example .env     # fill in your Atlas instance values
npm run dev              # bundles the client, starts the server with --watch
```

Open http://localhost:3000, sign in, then call the API:

```sh
curl http://localhost:3000/api/me          # { isSignedIn: false, ... }
curl http://localhost:3000/api/protected   # 401 UNAUTHENTICATED
```

Send a session as `Authorization: Bearer <jwt>` (or the `__session` cookie) to
reach the protected route.

## Packages

- `@atlasauth/express` — `atlasMiddleware`, `getAuth`, `requireAuth`
- `@atlasauth/js` — `FapiClient`, `initialFlow`, `advance`

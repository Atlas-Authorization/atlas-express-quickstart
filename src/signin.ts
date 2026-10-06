// Static sign-in page logic, bundled by `npm run build:client` (esbuild) into
// public/signin.bundle.js. It drives the Atlas Frontend API directly with the
// framework-agnostic @atlasauth/js `FapiClient` + flow helpers — no React.
import { FapiClient, initialFlow, advance, type AttemptView, type FlowState } from '@atlasauth/js';

/** Shape of `GET /v1/client` (only the fields this page reads). */
interface ClientView {
  session?: { id: string } | null;
  user?: unknown;
  jwt?: string;
}

/** Shape of `/config.json` served by src/server.ts. */
interface PageConfig {
  publishableKey: string;
  frontendApi: string;
}

// The server returns the attempt id; AttemptView in @atlasauth/js omits it.
type AttemptWithId = AttemptView & { id: string };

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};
const log = (msg: unknown): void => {
  $('out').textContent = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
};

async function main(): Promise<void> {
  const cfg = (await fetch('/config.json').then((r) => r.json())) as PageConfig;
  const client = new FapiClient({ publishableKey: cfg.publishableKey, baseUrl: cfg.frontendApi });

  // Reading the current session: GET /v1/client returns { session, user, jwt }.
  // The session cookie is sent automatically (FapiClient uses credentials:'include').
  async function readSession(): Promise<void> {
    const res = await client.get<ClientView>('/v1/client');
    if (!res.ok || !res.data?.user) return log('Signed out.');
    log({ user: res.data.user, sessionId: res.data.session?.id });
  }

  // Drive the sign-in flow one step at a time. `advance` POSTs the right FAPI
  // endpoint for the current step; a completed attempt carries a one-time
  // `ticket` we exchange for the session cookies.
  async function signIn(): Promise<void> {
    let flow: FlowState = initialFlow;
    const identifier = $<HTMLInputElement>('identifier').value;
    const password = $<HTMLInputElement>('password').value;

    // Step 1 — identifier. Step 2 — first factor (password here).
    flow = await advance(client, flow, { identifier });
    if (flow.errors.length) {
      log(flow.errors);
      return;
    }
    flow = await advance(client, flow, { password });
    if (flow.errors.length) {
      log(flow.errors);
      return;
    }

    if (flow.attempt?.status === 'complete' && flow.ticket) {
      await client.post('/v1/client/tickets/exchange', {
        attempt_id: (flow.attempt as AttemptWithId).id,
        ticket: flow.ticket,
      });
      await readSession();
      return;
    }
    log({ status: flow.attempt?.status, note: 'Needs another factor (e.g. MFA code).' });
  }

  async function signOut(): Promise<void> {
    const res = await client.get<ClientView>('/v1/client');
    const sid = res.data?.session?.id;
    if (sid) await client.post(`/v1/client/sessions/${sid}/revoke`);
    log('Signed out.');
  }

  $('signin').addEventListener('click', () => void signIn());
  $('session').addEventListener('click', () => void readSession());
  $('signout').addEventListener('click', () => void signOut());
  void readSession();
}

void main();

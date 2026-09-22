import assert from 'node:assert/strict';
import { APPLICATION_ORIGIN } from '../lib/deployment';

const base = process.env.TEST_BASE_URL || 'http://localhost:3041';
const origin = process.env.TEST_ORIGIN || APPLICATION_ORIGIN;
const firstEmail = `hosting-limit-${crypto.randomUUID()}@example.invalid`;
const secondEmail = `hosting-limit-${crypto.randomUUID()}@example.invalid`;
const password = 'Hosting-Verification-Only-826!';

async function login(email: string, expected: number) {
  const response = await fetch(`${base}/api/auth`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email, password }),
  });
  const body = await response.json();
  assert.equal(response.status, expected, JSON.stringify(body));
}

for (let attempt = 0; attempt < 20; attempt++) await login(firstEmail, 401);
await login(firstEmail, 429);
await login(secondEmail, 401);
await login(firstEmail.toUpperCase(), 429);
console.log(
  'PASS account throttling survives a shared proxy without blocking another account',
);

for (const path of ['/api/workspace', '/api/files?id=unavailable']) {
  const response = await fetch(base + path);
  assert.equal(response.status, 401, path);
  await response.arrayBuffer();
}
const denied = await fetch(`${base}/api/auth`, {
  method: 'POST',
  headers: {
    Origin: 'https://evil.example',
    'X-Forwarded-Host': 'compliance-calender.vercel.app',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ action: 'demo' }),
});
assert.equal(denied.status, 403);
console.log(
  'PASS anonymous data access and forged-origin mutations are rejected',
);

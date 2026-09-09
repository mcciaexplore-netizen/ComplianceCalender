import assert from 'node:assert/strict';
import { APPLICATION_ORIGIN, hasAllowedOrigin } from '../lib/deployment';

const upstream = 'https://compliance-mitra.vedshridikkar.chatgpt.site/api/auth';
const request = (origin: string, headers: Record<string, string> = {}) =>
  new Request(upstream, {
    method: 'POST',
    headers: { Origin: origin, ...headers },
  });

assert.equal(hasAllowedOrigin(request(APPLICATION_ORIGIN)), true);
assert.equal(hasAllowedOrigin(request(new URL(upstream).origin)), true);
assert.equal(hasAllowedOrigin(new Request(upstream)), true);
assert.equal(
  hasAllowedOrigin(
    new Request('http://localhost:3000/api/auth', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000' },
    }),
  ),
  true,
);

for (const origin of [
  'https://evil.example',
  'null',
  '',
  'http://compliance-calender.vercel.app',
  'https://compliance-calender.vercel.app.evil.example',
  'https://compliance-calender.vercel.app:444',
  'https://untrusted-preview.vercel.app',
]) {
  assert.equal(hasAllowedOrigin(request(origin)), false, origin);
  assert.equal(
    hasAllowedOrigin(
      request(origin, {
        'X-Forwarded-Host': 'compliance-calender.vercel.app',
        'X-Forwarded-Proto': 'https',
      }),
    ),
    false,
    `Forwarded headers must not authorize ${origin}`,
  );
}
console.log(
  'PASS exact public origin, direct origin and server clients; reject hostile origins and spoofed forwarded headers',
);

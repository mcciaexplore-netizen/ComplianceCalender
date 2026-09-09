import { config, reject, sameOrigin } from './repository';
import { access } from './service';
import { currentUser, rateLimit } from './auth';
import type { User } from './types';
// A same-origin relay keeps the Sarvam subscription key off the client. Unlike
// the Deepgram adapter, this provider supports auto-detection across en/hi/mr.
export async function sarvamRelay(req: Request, user: User) {
  sameOrigin(req);
  if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket')
    reject(400, 'A WebSocket connection is required.');
  if (config('STT_PROVIDER') !== 'sarvam' || !config('STT_API_KEY'))
    reject(503, 'The multilingual speech provider is not configured.');
  const url = new URL(req.url),
    id = url.searchParams.get('consultation_id') || '',
    language = url.searchParams.get('language') || 'Auto';
  const consultation = await access(user, id, true);
  if (consultation.status !== 'Live')
    reject(409, 'The consultation is not live.');
  await rateLimit('speech-relay:' + user.id, 100);
  const lang =
    language === 'Marathi'
      ? 'mr-IN'
      : language === 'Hindi'
        ? 'hi-IN'
        : language === 'English'
          ? 'en-IN'
          : 'auto';
  const target = `https://api.sarvam.ai/speech-to-text-realtime/ws?model=saaras:v3-realtime&language_code=${lang}&stream_type=balanced&encoding=linear16&sample_rate=16000&mode=codemix`;
  const upstreamResponse = await fetch(target, {
    headers: {
      Upgrade: 'websocket',
      'API-SUBSCRIPTION-KEY': config('STT_API_KEY'),
    },
    signal: AbortSignal.timeout(15000),
  });
  const upstream = upstreamResponse.webSocket;
  if (!upstream)
    reject(503, 'Live speech connection could not be established.');
  upstream.accept();
  const pair = new WebSocketPair(),
    client = pair[0],
    server = pair[1];
  server.accept();
  let closed = false,
    checking = false;
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(monitor);
    try {
      upstream.close(1000, 'Session closed');
    } catch {}
    try {
      server.close(1000, 'Session closed');
    } catch {}
  };
  const monitor = setInterval(async () => {
    if (checking) return;
    checking = true;
    try {
      const u = await currentUser(req),
        c = await access(u, id, true);
      if (c.status !== 'Live') close();
    } catch {
      close();
    } finally {
      checking = false;
    }
  }, 10000);
  server.addEventListener('message', (e) => {
    try {
      if (typeof e.data === 'string') {
        const message = JSON.parse(e.data);
        if (message.event === 'end')
          upstream.send(JSON.stringify({ event: 'end' }));
        return;
      }
      const bytes = new Uint8Array(e.data as ArrayBuffer);
      if (bytes.byteLength > 32000) {
        close();
        return;
      }
      let binary = '';
      for (const b of bytes) binary += String.fromCharCode(b);
      upstream.send(
        JSON.stringify({ event: 'audio_input', audio: btoa(binary) }),
      );
    } catch {
      close();
    }
  });
  upstream.addEventListener('message', (e) => {
    if (closed) return;
    try {
      server.send(e.data);
    } catch {
      close();
    }
  });
  for (const connection of [server, upstream]) {
    connection.addEventListener('close', close);
    connection.addEventListener('error', close);
  }
  return new Response(null, { status: 101, webSocket: client });
}

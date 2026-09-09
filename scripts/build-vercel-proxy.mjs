import { mkdir, writeFile } from 'node:fs/promises';

// Vercel owns the public URL; the existing Worker owns rendering and APIs.
// Do not emit another client build that could disagree with the upstream server.
const output = new URL('../.vercel-public/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(
  new URL('index.html', output),
  '<!doctype html><html lang="en"><meta charset="utf-8"><title>Compliance Calendar</title><p>Compliance Calendar is temporarily unavailable. Please try again.</p></html>',
);
console.log('Prepared the Compliance Calendar public gateway.');

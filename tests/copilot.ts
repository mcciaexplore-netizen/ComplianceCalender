import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  normalize,
  detectLanguage,
  inferScenario,
  SentenceQuestionDetector,
  validateAnswer,
  ABSTENTION,
  chunkText,
} from '../lib/copilot/engine';
import type {
  Source,
  Workspace,
  ConsultationDetail,
} from '../lib/copilot/types';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
let checks = 0;
function check(value: unknown, message: string) {
  assert.ok(value, message);
  checks++;
}
class Client {
  cookie = '';
  async call<T = any>(path: string, body?: unknown, status = 200): Promise<T> {
    const r = await fetch(base + '/api/copilot/' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Cookie: this.cookie,
        ...(body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined
        ? {}
        : { body: body instanceof FormData ? body : JSON.stringify(body) }),
      signal: AbortSignal.timeout(60000),
    });
    const result = await r.json();
    assert.equal(r.status, status, `${path}: ${JSON.stringify(result)}`);
    checks++;
    const cookie = r.headers.get('set-cookie');
    if (cookie) this.cookie = cookie.split(';')[0];
    return result as T;
  }
  async role(role: string) {
    return this.call('auth', { action: 'demo-role', role });
  }
  async doc(name: string, bytes: Uint8Array | string) {
    const form = new FormData();
    form.set('file', new File([bytes as BlobPart], name));
    form.set('source', 'Approved test preparation handbook');
    form.set('category', 'Test collection');
    return this.call('knowledge/upload', form);
  }
}
const source: Source = {
  id: 's',
  document_id: 'd',
  title: 'Discovery checklist',
  section: '1',
  updated: new Date().toISOString(),
  excerpt:
    'Confirm Udyam registration. Record business location. Policy edition 2025.',
  source: 'Internal checklist',
  score: 0.8,
};
check(normalize('योजना') === 'योजना', 'Combining marks must remain intact');
check(
  inferScenario('मला अनुदान योजना सांगा') === 'schemes',
  'Native Marathi retrieval',
);
check(
  detectLanguage('तुम कैसे हो?') === 'Hindi',
  'Hindi must not be inferred as Marathi',
);
check(
  detectLanguage('Mujhe business ke liye loan chahiye') === 'Hindi',
  'Hinglish detection',
);
check(
  detectLanguage('माझ्या कंपनीला मदत पाहिजे') === 'Marathi',
  'Marathi detection',
);
const detector = new SentenceQuestionDetector();
check(
  detector.detect('GST due?', 'Client').meaningful,
  'Short complete question',
);
check(
  detector.detect('बँक कर्ज मंजूर करत नाही.', 'Client').meaningful,
  'Proactive Marathi financing need',
);
check(
  !detector.detect('What is your turnover?', 'Consultant').meaningful,
  'Consultant questions must not trigger answers',
);
check(
  !detector.detect('Good morning, everyone.', 'Client').meaningful,
  'Small talk must not trigger AI',
);
const valid = {
  short_answer: 'Confirm Udyam registration.',
  key_points: ['Record business location.'],
  what_to_check: [],
  source_ids: ['s'],
};
check(!!validateAnswer(valid, [source]), 'Supported extract accepted');
check(
  !validateAnswer({ ...valid, source_ids: ['invented'] }, [source]),
  'Forged citation rejected',
);
check(
  !validateAnswer({ ...valid, short_answer: 'Approval is guaranteed.' }, [
    source,
  ]),
  'Unsupported nonnumeric promise rejected',
);
check(
  !validateAnswer({ ...valid, what_to_check: ['99% subsidy'] }, [source]),
  'Unsupported checklist claim rejected',
);
check(
  !validateAnswer({ ...valid, short_answer: '९९% अनुदान मिळेल.' }, [source]),
  'Unsupported Devanagari numeric claim rejected',
);
check(
  !validateAnswer({ ...valid, short_answer: '25 days.' }, [source]),
  'Substring of source year is not numeric evidence',
);
check(
  chunkText('word '.repeat(1200)).every((c) => c.length <= 1800),
  'Bounded extraction chunks',
);
console.log('Engine safety and multilingual checks passed.');
const anonymous = new Client();
await anonymous.call('workspace', undefined, 401);
await anonymous.call('consultations', undefined, 401);
const a = new Client(),
  b = new Client();
await a.call('auth', { action: 'demo' });
await b.call('auth', { action: 'demo' });
let ws = await a.call<Workspace>('workspace');
check(ws.user.role === 'Consultant', 'Demo starts as a consultant');
check(ws.consultants.length === 5, 'Five seeded consultants');
check(ws.knowledge.length === 50, 'Fifty seeded knowledge documents');
check(
  ws.consultations.every(
    (c) =>
      ws.consultants.find((p) => p.id === c.consultant_id)?.user_id ===
      ws.user.id,
  ),
  'Assigned consultations only',
);
await a.role('Admin');
ws = await a.call<Workspace>('workspace');
check(ws.consultations.length === 20, 'Twenty seeded consultations');
check(ws.companies.length === 10, 'Ten seeded companies');
const c = await a.call('consultations', {
  scenario: 'schemes',
  demo: true,
  consultant_id: ws.consultants.find((x) => x.name === 'Aditya Deshmukh')!.id,
});
await a.call(`consultations/${c.id}/start`, { consent: true });
await b.call(`consultations/${c.id}`, undefined, 404);
await b.call(`consultations/${c.id}/end`, {}, 404);
await b.call(`client/${c.client_id}`, undefined, 404);
const cross = await fetch(base + '/api/copilot/settings', {
  method: 'POST',
  headers: {
    Cookie: a.cookie,
    Origin: 'https://untrusted.example',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ language: 'Hindi', autoCopilot: true }),
});
check(cross.status === 403, 'Cross-origin mutation blocked');
const seg = {
  consultation_id: c.id,
  text: 'माझ्या manufacturing business साठी government subsidy मिळू शकते का?',
  speaker: 'Client',
  external_id: 'stable-client-segment',
  response_language: 'Marathi',
};
await a.call('transcription', seg);
await a.call('transcription', seg);
async function answerReady(client: Client, id: string) {
  for (let n = 0; n < 50; n++) {
    const detail = await client.call<ConsultationDetail>(`consultations/${id}`);
    if (detail.suggestions.length) return detail;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('AI did not publish a suggestion');
}
let detail = await answerReady(a, c.id);
check(
  detail.transcript.length === 1,
  'Duplicate transcript replay is idempotent',
);
check(
  detail.suggestions.length === 1,
  'Duplicate transcript did not generate another answer',
);
check(
  /[\u0900-\u097F]/.test(detail.suggestions[0].short_answer),
  'Marathi answer',
);
check(
  detail.suggestions[0].followups.every((q) => /[\u0900-\u097F]/.test(q)),
  'Follow-ups are localized',
);
check(
  detail.suggestions[0].sources.length > 0,
  'Answer includes approved sources',
);
await a.call('ai/feedback', {
  suggestion_id: detail.suggestions[0].id,
  value: 'Helpful',
});
await a.call('ai/feedback', {
  suggestion_id: detail.suggestions[0].id,
  value: 'Needs Verification',
});
await b.call(
  'ai/feedback',
  { suggestion_id: detail.suggestions[0].id, value: 'Helpful' },
  404,
);
await a.call(`consultations/${c.id}/notes`, {
  text: 'Review the proposed investment with the client.',
});
await a.call(`consultations/${c.id}/followups`, {
  text: 'Review project documents',
  due: '2026-10-01',
  status: 'Planned',
});
const sseAbort = new AbortController();
const stream = await fetch(base + `/api/copilot/consultations/${c.id}/events`, {
  headers: { Cookie: a.cookie },
  signal: sseAbort.signal,
});
check(
  stream.status === 200 &&
    stream.headers.get('content-type')?.includes('text/event-stream'),
  'Authenticated SSE is available',
);
const reader = stream.body!.getReader();
let events = '';
while (!events.includes('ai.answer')) {
  const { value, done } = await reader.read();
  if (done) break;
  events += new TextDecoder().decode(value);
  if (events.length > 100000) break;
}
check(
  events.includes('transcript.final') &&
    events.includes('ai.answer') &&
    events.includes('client.profile.updated'),
  'Pipeline events reach the SSE stream',
);
sseAbort.abort();
await a.role('Supervisor');
await a.call(`consultations/${c.id}`);
await a.call(`consultations/${c.id}/notes`, { text: 'Forbidden' }, 403);
await a.call(`consultations/${c.id}/end`, {}, 403);
await a.role('Consultant');
await a.call(`consultations/${c.id}`);
const wrong = ws.consultations.find(
  (x) => x.consultant_id !== c.consultant_id,
)!;
await a.call(`consultations/${wrong.id}`, undefined, 403);
await a.role('Admin');
const txt = await a.doc(
  'handbook.txt',
  'Frostguard preparation checklist. Collect current business records and verify the intended use of funding.',
);
check(txt.status === 'Draft', 'Uploads begin as drafts');
const consultant = new Client();
consultant.cookie = a.cookie;
await consultant.role('Consultant');
const consultantWs = await consultant.call<Workspace>('workspace');
check(
  !consultantWs.knowledge.some((d) => d.id === txt.id),
  'Draft content not exposed to consultants',
);
const denied = await fetch(base + `/api/copilot/knowledge/${txt.id}/download`, {
  headers: { Cookie: consultant.cookie },
});
check(denied.status === 403, 'Draft download denied');
check(
  (await consultant.call<any[]>('knowledge/search?q=Frostguard')).length === 0,
  'Draft chunks excluded from retrieval',
);
await a.call(`knowledge/${txt.id}/status`, { status: 'Approved' });
check(
  (await consultant.call<any[]>('knowledge/search?q=Frostguard')).some(
    (s) => s.document_id === txt.id,
  ),
  'Approved upload is searchable',
);
const wb = new ExcelJS.Workbook();
wb.addWorksheet('Checklist').addRows([
  ['Topic', 'Guidance'],
  ['Frostguard records', 'Review current business records before advising.'],
]);
const xlsx = await a.doc(
  'checklist.xlsx',
  new Uint8Array(await wb.xlsx.writeBuffer()),
);
check(xlsx.content.includes('Frostguard'), 'XLSX text extraction');
const csv = await a.doc(
  'checklist.csv',
  'Topic,Guidance\nPreparation,Collect current business records and verify the purpose of funding.',
);
check(csv.status === 'Draft', 'CSV processed');
const zip = new JSZip();
zip.file(
  '[Content_Types].xml',
  '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
);
zip.file(
  'word/document.xml',
  '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Frostguard document checklist: collect current business records and confirm the funding purpose.</w:t></w:r></w:p></w:body></w:document>',
);
const docx = await a.doc(
  'checklist.docx',
  await zip.generateAsync({ type: 'uint8array' }),
);
check(docx.content.includes('Frostguard'), 'DOCX text extraction');
const pdf = await PDFDocument.create();
const page = pdf.addPage(),
  font = await pdf.embedFont(StandardFonts.Helvetica);
page.drawText(
  'Frostguard checklist: review business records before advising.',
  { x: 50, y: 700, font, size: 12 },
);
const pd = await a.doc('checklist.pdf', await pdf.save());
check(pd.content.includes('Frostguard'), 'PDF text layer extracted');
const blank = await PDFDocument.create();
for (let i = 0; i < 8; i++) blank.addPage();
const form = new FormData();
form.set('file', new File([(await blank.save()) as BlobPart], 'scanned.pdf'));
await a.call('knowledge/upload', form, 400);
await a.call(`consultations/${c.id}/notes`, { generate: true });
const ending = await a.call(`consultations/${c.id}/end`, {});
check(
  ending.summary.includes('Primary Problem') &&
    ending.summary.includes('Important Risks'),
  'Structured summary generated',
);
await a.call(`consultations/${c.id}/summary`, {
  summary: ending.summary + '\nReviewed by consultant.',
});
detail = await a.call(`consultations/${c.id}`);
check(
  detail.status === 'Completed' &&
    detail.summary?.endsWith('Reviewed by consultant.'),
  'Summary persists',
);
check(detail.notes?.includes('Documents Required'), 'Generated notes persist');
check(
  detail.suggestions[0].feedback === 'Needs Verification',
  'Feedback update persists',
);
await a.call('transcription', { ...seg, external_id: 'after-end' }, 409);
await a.call(`consultations/${c.id}/start`, { consent: true }, 409);
for (const scenario of ['loans', 'gst', 'expansion', 'exports', 'marketing']) {
  const item = await a.call('consultations', {
    scenario,
    demo: true,
    consultant_id: c.consultant_id,
  });
  await a.call(`consultations/${item.id}/start`, { consent: true });
  let done = false;
  for (let n = 0; n < 8 && !done; n++) {
    const result = await a.call(`consultations/${item.id}/simulate`, {
      language: scenario === 'loans' ? 'Hindi' : 'English',
      generate: true,
    });
    done = result.done;
  }
  const result = await answerReady(a, item.id);
  check(
    result.transcript.length >= 3 &&
      result.suggestions.some((s) => s.sources.length),
    'Working scenario: ' + scenario,
  );
  await a.call(`consultations/${item.id}/end`, {});
}
// Real organizations contain no seeded policy claims or shared demo access.
const real = new Client(),
  suffix = crypto.randomUUID();
await real.call('auth', {
  action: 'register',
  name: 'Test Admin',
  organization: 'Private Test Helpline',
  email: `admin-${suffix}@example.invalid`,
  password: 'Test-Private-Password-2026',
});
let actual = await real.call<Workspace>('workspace');
check(
  actual.knowledge.length === 0 && actual.consultations.length === 0,
  'Real workspace starts empty',
);
await real.call('auth', { action: 'demo-role', role: 'Admin' }, 403);
await real.call('consultants', {
  name: 'Test Consultant',
  email: `consultant-${suffix}@example.invalid`,
  password: 'Test-Private-Password-2026',
  role: 'Consultant',
  specialty: 'General advisory',
  languages: 'English, Hindi, Marathi',
});
actual = await real.call('workspace');
const rc = await real.call('consultations', {
  scenario: 'loans',
  consultant_id: actual.consultants[0].id,
  client: 'Test Client',
  company: 'Test Company',
  start: '2026-10-20T10:00:00.000Z',
  end: '2026-10-20T10:30:00.000Z',
});
await real.call(
  'consultations',
  {
    scenario: 'loans',
    consultant_id: actual.consultants[0].id,
    client: 'Other Client',
    company: 'Other Company',
    start: '2026-10-20T10:15:00.000Z',
    end: '2026-10-20T10:45:00.000Z',
  },
  409,
);
await real.call(`consultations/${rc.id}/start`, { consent: false }, 400);
await real.call(`consultations/${rc.id}/start`, { consent: true });
const unknown = await real.call('ai/suggestion', {
  consultation_id: rc.id,
  question: 'Can you guarantee a loan approval?',
  language: 'English',
});
check(
  unknown.short_answer === ABSTENTION && unknown.sources.length === 0,
  'No evidence means no fabricated advice',
);
await real.call(`consultations/${rc.id}/simulate`, {}, 403);
const realConsultant = new Client();
await realConsultant.call('auth', {
  action: 'login',
  email: `consultant-${suffix}@example.invalid`,
  password: 'Test-Private-Password-2026',
});
check(
  (await realConsultant.call<Workspace>('workspace')).consultations.length ===
    1,
  'Provisioned consultant can log in and see assignment',
);
await realConsultant.call('categories', { name: 'Forbidden' }, 403);
await real.call(`consultations/${rc.id}/end`, {});
await real.call('consultants', {
  action: 'update',
  id: actual.consultants[0].id,
  name: 'Test Consultant',
  specialty: 'General advisory',
  languages: 'English',
  active: false,
});
await realConsultant.call('workspace', undefined, 401);
await real.call('auth', { action: 'logout' });
await real.call('workspace', undefined, 401);
console.log(
  `PASS: ${checks} copilot assertions across authentication, RBAC, isolation, multilingual AI, all six scenarios, uploads, SSE, feedback, notes, summary and scheduling.`,
);

import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import ExcelJS from 'exceljs';
import { pdfReport, excelReport } from '../lib/reports';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
class Client {
  cookie = '';
  async call(path: string, body?: any, expected = 200) {
    const res = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data: any = await res.json();
    assert.equal(res.status, expected, JSON.stringify(data));
    const cookie = res.headers.get('set-cookie');
    if (cookie) this.cookie = cookie.split(';')[0];
    return data;
  }
  async ws() {
    return this.call('/api/workspace');
  }
  async action(body: any, status = 200) {
    return this.call('/api/workspace', body, status);
  }
  async role(role: string) {
    await this.call('/api/auth', { action: 'demo-role', role });
  }
  async file(
    name: string,
    type: string,
    bytes: Uint8Array,
    record_id?: string,
  ) {
    const form = new FormData();
    form.set('file', new File([bytes as BlobPart], name, { type }));
    form.set('category', 'Audit');
    if (record_id) form.set('record_id', record_id);
    const res = await fetch(base + '/api/files', {
      method: 'POST',
      headers: { Cookie: this.cookie },
      body: form,
    });
    const body: any = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    return body.id;
  }
}
const c = new Client();
await c.call('/api/auth', { action: 'demo' });
let w = await c.ws();
assert.equal(w.users.length, 7);
const companyId = w.company.id,
  employee = w.users.find((u: any) => u.role === 'Employee').id,
  reviewer = w.users.find((u: any) => u.role === 'Reviewer').id;
assert.ok(w.users.every((u: any) => !u.password && !u.recovery));
const requirement = w.records.find((r: any) => r.kind === 'requirement');
await c.action(
  {
    action: 'verify-requirement',
    id: requirement.id,
    decision: 'Applicable',
    remarks: 'Reviewed for test',
    source: 'Test reference',
  },
  403,
);
await c.role('Expert');
await c.action({
  action: 'verify-requirement',
  id: requirement.id,
  decision: 'Applicable',
  remarks: 'Illustrative test verification',
  source: 'Internal test reference',
});
w = await c.ws();
const task = w.records.find(
  (r: any) => r.kind === 'task' && r.parent_id === requirement.id,
);
assert.ok(task);
await c.role('Employee');
await c.action(
  { action: 'transition', id: task.id, status: 'Awaiting Approval' },
  400,
);
await c.action({
  action: 'save',
  id: task.id,
  data: {
    checklist: task.checklist.map((q: any) => ({ ...q, done: true })),
    filing_date: '2026-09-05',
    acknowledgement: 'TEST-ACK-001',
    payment_amount: 12500,
  },
});
const pdf = await PDFDocument.create();
pdf.addPage().drawText('Test filing acknowledgement');
const evidence = await c.file(
  'acknowledgement.pdf',
  'application/pdf',
  await pdf.save(),
  task.id,
);
await c.action({
  action: 'transition',
  id: task.id,
  status: 'Awaiting Approval',
});
await c.action({ action: 'transition', id: task.id, status: 'Completed' }, 403);
await c.role('Reviewer');
await c.action({ action: 'transition', id: task.id, status: 'Returned' }, 400);
await c.action({
  action: 'transition',
  id: task.id,
  status: 'Returned',
  comment: 'Clarify the amount',
});
await c.role('Employee');
await c.action({
  action: 'save',
  id: task.id,
  data: { notes: 'Amount checked' },
});
await c.action({
  action: 'transition',
  id: task.id,
  status: 'Awaiting Approval',
});
await c.role('Reviewer');
await c.action({ action: 'transition', id: task.id, status: 'Completed' });
w = await c.ws();
assert.equal(w.records.find((r: any) => r.id === task.id).status, 'Completed');
assert.ok(
  w.records.some(
    (r: any) =>
      r.kind === 'task' && r.parent_id === requirement.id && r.id !== task.id,
  ),
);
console.log(
  'PASS task verification → evidence → correction → resubmission → approval → recurrence',
);
await c.role('Auditor');
const auditor = (await c.ws()).user.id;
const made = await c.action({
  action: 'create',
  kind: 'audit',
  data: {
    title: 'Workflow test audit',
    owner_id: auditor,
    reviewer_id: reviewer,
    due: '2026-09-30',
    department: 'Quality',
  },
});
await c.action({ action: 'transition', id: made.id, status: 'In Progress' });
await c.action({
  action: 'save',
  id: made.id,
  data: {
    questions: [
      {
        title: 'Check filing evidence',
        assessment: 'Non-Compliant',
        observation: 'Proof missing',
        action: 'Obtain signed proof',
        owner_id: employee,
        due: '2026-09-20',
        weight: 1,
        risk: 'High',
      },
    ],
  },
});
await c.action({ action: 'transition', id: made.id, status: 'Submitted' });
w = await c.ws();
const action = w.records.find(
  (r: any) => r.kind === 'action' && r.parent_id === made.id,
);
assert.ok(action);
await c.role('Reviewer');
await c.action({ action: 'transition', id: made.id, status: 'Under Review' });
await c.action(
  { action: 'transition', id: made.id, status: 'Closed', comment: 'Checked' },
  400,
);
await c.role('Employee');
await c.action({ action: 'transition', id: action.id, status: 'In Progress' });
await c.file(
  'action-proof.pdf',
  'application/pdf',
  await pdf.save(),
  action.id,
);
await c.action({
  action: 'transition',
  id: action.id,
  status: 'Pending Verification',
});
await c.role('Reviewer');
await c.action({
  action: 'transition',
  id: action.id,
  status: 'Closed',
  comment: 'Evidence verified',
});
await c.action({
  action: 'transition',
  id: made.id,
  status: 'Closed',
  comment: 'Findings resolved',
});
console.log(
  'PASS audit → finding → assigned corrective action → evidence → verification → closure',
);
await c.role('Owner');
const imageBytes = await readFile(
  new URL('../public/assets/mccia-logo.png', import.meta.url),
);
const logo = await c.file('test-company-logo.png', 'image/png', imageBytes);
await c.action({
  action: 'company',
  data: { ...(await c.ws()).company, logo },
});
const k = await c.action({
  action: 'create',
  kind: 'kaizen',
  data: {
    title: 'Tool setup improvement',
    owner_id: employee,
    reviewer_id: reviewer,
    due: '2026-09-30',
    problem: 'Long setup',
    root_cause: 'Scattered tools',
    improvement: 'Stage tools',
    proposed_action: 'Verify new setup',
    actual_savings: 25000,
    expected_savings: 40000,
  },
});
await c.role('Employee');
await c.action({ action: 'transition', id: k.id, status: 'In Progress' });
const before = await c.file('before.png', 'image/png', imageBytes, k.id),
  after = await c.file('after.png', 'image/png', imageBytes, k.id);
await c.action({
  action: 'save',
  id: k.id,
  data: { before_image: before, after_image: after },
});
await c.action({ action: 'transition', id: k.id, status: 'Implemented' });
await c.role('Reviewer');
await c.action({
  action: 'transition',
  id: k.id,
  status: 'Verified',
  comment: 'Benefits validated',
});
w = await c.ws();
const ka = w.records.find(
  (r: any) => r.kind === 'action' && r.parent_id === k.id,
);
await c.action({
  action: 'transition',
  id: ka.id,
  status: 'Closed',
  comment: 'Implementation confirmed',
});
await c.action({
  action: 'transition',
  id: k.id,
  status: 'Closed',
  comment: 'Improvement complete',
});
console.log(
  'PASS Kaizen → before/after → benefit → linked action → verification → closure',
);
await c.role('Owner');
w = await c.ws();
const other = new Client();
await other.call('/api/auth', { action: 'demo' });
await other.action(
  { action: 'save', id: task.id, data: { title: 'Tampered' } },
  404,
);
const denied = await fetch(base + `/api/files?id=${evidence}`, {
  headers: { Cookie: other.cookie },
});
assert.equal(denied.status, 404);
const anonymous = await fetch(base + '/api/workspace');
assert.equal(anonymous.status, 401);
const csrf = await fetch(base + '/api/workspace', {
  method: 'POST',
  headers: {
    Cookie: c.cookie,
    Origin: 'https://evil.example',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ action: 'read-notifications' }),
});
assert.equal(csrf.status, 403);
console.log(
  'PASS tenant separation, anonymous access, cross-origin rejection, employee approval restriction',
);
const nativeFetch = globalThis.fetch;
globalThis.fetch = ((url: any, options?: any) =>
  nativeFetch(
    typeof url === 'string' && url.startsWith('/') ? base + url : url,
    { ...options, headers: { ...options?.headers, Cookie: c.cookie } },
  )) as typeof fetch;
await mkdir('tests/artifacts', { recursive: true });
for (const [title, kind] of [
  ['Monthly Compliance Report', 'task'],
  ['Compliance Audit Form', 'audit'],
  ['Kaizen Improvement Audit Form', 'kaizen'],
  ['Corrective Action Report', 'action'],
  ['Licence Report', 'licence'],
]) {
  const rows = w.records.filter((r: any) => r.kind === kind);
  const bytes = await pdfReport(w.company, title, rows);
  const loaded = await PDFDocument.load(bytes);
  assert.ok(loaded.getPageCount() > 0);
  await writeFile(`tests/artifacts/${kind}.pdf`, bytes);
}
const xlsx = await excelReport(
  w.company,
  'Compliance register',
  w.records.filter((r: any) => r.kind === 'task'),
);
await writeFile('tests/artifacts/report.xlsx', Buffer.from(xlsx));
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(xlsx as any);
assert.equal(workbook.worksheets[0].getCell('A1').value, w.company.name);
assert.ok(workbook.worksheets[0].getImages().length);
globalThis.fetch = nativeFetch;
console.log(
  'PASS branded PDF forms and real XLSX export, including company name and logo',
);
const account = new Client(),
  email = `test-${Date.now()}@example.invalid`;
const registration = await account.call('/api/auth', {
  action: 'register',
  email,
  password: 'Testing-Password-826!',
  company: 'Workflow Test Company',
  name: 'Test Owner',
  mobile: '9000000000',
});
assert.ok(registration.recovery);
assert.notEqual((await account.ws()).company.id, companyId);
await account.call('/api/auth', { action: 'logout' });
await account.call('/api/auth', {
  action: 'login',
  email,
  password: 'Testing-Password-826!',
});
await account.call('/api/auth', { action: 'logout' });
await account.call('/api/auth', {
  action: 'reset',
  email,
  password: 'Replacement-Password-826!',
  recovery: registration.recovery,
});
await account.call('/api/auth', {
  action: 'login',
  email,
  password: 'Replacement-Password-826!',
});
console.log(
  'PASS registration, sign in, sign out, one-time recovery and password reset',
);
console.log('ALL WORKFLOW TESTS PASSED');

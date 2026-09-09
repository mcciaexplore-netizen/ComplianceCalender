import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import { extractWorkbook } from './xlsx';
import {
  uid,
  first,
  rows,
  execute,
  reject,
  timestamp,
  storage,
  audit,
} from './repository';
import { permit } from './auth';
import { chunkText } from './engine';
import { storeChunks } from './providers';
import type { User, KnowledgeDocument } from './types';
function checkZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let total = 0,
    entries = 0;
  for (let i = 0; i + 46 < bytes.length; i++) {
    if (view.getUint32(i, true) !== 0x02014b50) continue;
    total += view.getUint32(i + 24, true);
    entries++;
    if (total > 24 * 1024 * 1024 || entries > 1500)
      reject(400, 'The document expands beyond the safe extraction limit.');
    i +=
      45 +
      view.getUint16(i + 28, true) +
      view.getUint16(i + 30, true) +
      view.getUint16(i + 32, true);
  }
}
export async function upload(user: User, req: Request) {
  permit(user, ['Admin']);
  const form = await req.formData(),
    file = form.get('file');
  if (!(file instanceof File) || !file.size)
    reject(400, 'Select a document to upload.');
  if (file.size > 10 * 1024 * 1024)
    reject(413, 'Upload a document smaller than 10 MB.');
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !['pdf', 'docx', 'xlsx', 'csv', 'txt'].includes(ext))
    reject(400, 'Supported documents: PDF, DOCX, XLSX, CSV and TXT.');
  const category = String(form.get('category') || 'Uncategorized').slice(
    0,
    100,
  );
  const doc: KnowledgeDocument = {
    id: uid(),
    title: String(form.get('title') || file.name).slice(0, 200),
    category,
    department: String(form.get('department') || '').slice(0, 150),
    scheme: String(form.get('scheme') || '').slice(0, 150),
    state: String(form.get('state') || 'All states').slice(0, 100),
    industry: String(form.get('industry') || 'All industries').slice(0, 100),
    effective_date: String(form.get('effective_date') || '').slice(0, 10),
    source: String(form.get('source') || 'Internal upload').slice(0, 1000),
    version: String(form.get('version') || '1.0').slice(0, 50),
    updated: timestamp(),
    status: 'Processing',
    content: '',
    filename: file.name.slice(0, 250),
    type: ext.toUpperCase(),
    demo: 0,
  };
  await execute(
    'INSERT INTO cop_documents(id,tenant_id,category,status,updated,data) VALUES(?,?,?,?,?,?)',
    doc.id,
    user.tenant_id,
    doc.category,
    doc.status,
    doc.updated,
    JSON.stringify(doc),
  );
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let parts: string[] = [];
    if (ext === 'pdf') {
      const pdf = await getDocumentProxy(bytes, { maxImageSize: 16777216 });
      try {
        if (pdf.numPages > 100)
          reject(400, 'PDFs are limited to 100 pages per document.');
        const result = await extractText(pdf);
        if (result.text.join('').trim().length < 30)
          reject(
            400,
            'No usable text found. Scanned PDFs need OCR before upload.',
          );
        parts = result.text.map((page, i) => `Page ${i + 1}\n${page}`);
      } finally {
        await pdf.loadingTask.destroy();
      }
    } else if (ext === 'docx') {
      checkZip(bytes);
      parts = [
        (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value,
      ];
    } else if (ext === 'xlsx') {
      checkZip(bytes);
      parts = await extractWorkbook(bytes);
    } else parts = [new TextDecoder('utf-8', { fatal: true }).decode(bytes)];
    const content = parts.join('\n\n').trim();
    if (content.length < 30)
      reject(400, 'No usable text found. Scanned PDFs need OCR before upload.');
    if (content.length > 1000000)
      reject(
        400,
        'Extracted text exceeds 1 million characters. Split the document.',
      );
    doc.content = content;
    doc.status = 'Draft';
    await storage().put(`${user.tenant_id}/copilot/${doc.id}`, bytes, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    });
    await storeChunks(
      user.tenant_id,
      doc.id,
      parts.flatMap((p) => chunkText(p)),
    );
    await execute(
      'UPDATE cop_documents SET status=?,data=? WHERE id=?',
      'Draft',
      JSON.stringify(doc),
      doc.id,
    );
    await execute(
      'INSERT INTO cop_categories(id,tenant_id,name) VALUES(?,?,?) ON CONFLICT(tenant_id,name) DO NOTHING',
      uid(),
      user.tenant_id,
      category,
    );
    await audit(user, 'Uploaded knowledge document for approval', doc.id);
    return doc;
  } catch (error) {
    doc.status = 'Failed';
    doc.error =
      error instanceof Error ? error.message : 'Text extraction failed.';
    await execute(
      'DELETE FROM cop_chunks WHERE document_id=? AND tenant_id=?',
      doc.id,
      user.tenant_id,
    );
    await execute(
      'UPDATE cop_documents SET status=?,data=? WHERE id=?',
      'Failed',
      JSON.stringify(doc),
      doc.id,
    );
    throw error;
  }
}
export async function approveDocument(user: User, id: string, status: string) {
  permit(user, ['Admin']);
  if (!['Approved', 'Draft'].includes(status))
    reject(400, 'Choose Approved or Draft.');
  const r = await first(
    'SELECT * FROM cop_documents WHERE id=? AND tenant_id=?',
    id,
    user.tenant_id,
  );
  if (!r) reject(404, 'Document not found.');
  const d = JSON.parse(r.data) as KnowledgeDocument;
  if (['Failed', 'Processing'].includes(d.status))
    reject(409, 'Only successfully processed documents can be approved.');
  d.status = status as 'Approved' | 'Draft';
  d.updated = timestamp();
  await execute(
    'UPDATE cop_documents SET status=?,updated=?,data=? WHERE id=?',
    d.status,
    d.updated,
    JSON.stringify(d),
    id,
  );
  await audit(
    user,
    status === 'Approved'
      ? 'Approved knowledge document'
      : 'Withdrew knowledge approval',
    id,
  );
  return d;
}
export async function download(user: User, id: string) {
  const r = await first(
    'SELECT data FROM cop_documents WHERE id=? AND tenant_id=?',
    id,
    user.tenant_id,
  );
  if (!r) reject(404, 'Document not found.');
  const d = JSON.parse(r.data) as KnowledgeDocument;
  if (user.role !== 'Admin' && d.status !== 'Approved')
    reject(403, 'This document is not approved.');
  if (d.demo)
    return new Response(d.content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="training-${d.id}.txt"`,
        'Cache-Control': 'no-store',
      },
    });
  const blob = await storage().get(`${user.tenant_id}/copilot/${id}`);
  if (!blob) reject(404, 'Original file is unavailable.');
  return new Response(blob.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(d.filename)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}

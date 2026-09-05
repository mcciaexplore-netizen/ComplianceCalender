import {
  session,
  sameOrigin,
  responseError,
  fail,
  one,
  all,
  run,
  id,
  now,
  bucket,
  log,
  record,
  managers,
} from '@/lib/server';
const types: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'text/csv': 'csv',
  'text/plain': 'txt',
};
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await session(req);
    const f = await req.formData(),
      file = f.get('file');
    if (!(file instanceof File) || !file.size) fail('Choose a nonempty file.');
    if (file.size > 10 * 1024 * 1024) fail('Files must be 10 MB or smaller.');
    if (!types[file.type])
      fail('Supported formats: PDF, PNG, JPG, XLSX, DOCX, CSV and TXT.');
    const recordId =
      typeof f.get('record_id') === 'string'
        ? (f.get('record_id') as string)
        : '';
    if (recordId) {
      const r = await record(u.organization_id, recordId);
      if (
        !managers.includes(u.role) &&
        r.owner_id !== u.id &&
        r.reviewer_id !== u.id &&
        !['Expert', 'Auditor'].includes(u.role)
      )
        fail('You cannot upload to this record.', 403);
      if (['Completed', 'Closed'].includes(r.status))
        fail('Evidence for closed records cannot be changed.');
    } else if (u.role === 'Employee')
      fail('Select an assigned task for this upload.', 403);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const signature = (xs: number[]) => xs.every((x, i) => bytes[i] === x);
    if (file.type === 'application/pdf' && !signature([37, 80, 68, 70]))
      fail('The file content does not match a PDF.');
    if (
      file.type === 'image/png' &&
      !signature([137, 80, 78, 71, 13, 10, 26, 10])
    )
      fail('Invalid PNG image.');
    if (file.type === 'image/jpeg' && !signature([255, 216, 255]))
      fail('Invalid JPEG image.');
    if (['xlsx', 'docx'].includes(types[file.type]) && !signature([80, 75]))
      fail('Invalid Office document.');
    const fid = id(),
      name = file.name.replace(/[\r\n"\\/]/g, '_').slice(0, 180);
    const previous = await one(
      'SELECT MAX(version) version FROM files WHERE organization_id=? AND name=? AND COALESCE(record_id,?)=?',
      u.organization_id,
      name,
      '',
      recordId,
    );
    await bucket().put(`${u.organization_id}/${fid}`, bytes, {
      httpMetadata: { contentType: file.type },
    });
    await run(
      'INSERT INTO files(id,organization_id,record_id,name,type,size,category,uploaded_by,created,version) VALUES(?,?,?,?,?,?,?,?,?,?)',
      fid,
      u.organization_id,
      recordId || null,
      name,
      file.type,
      file.size,
      typeof f.get('category') === 'string'
        ? (f.get('category') as string)
        : 'Other',
      u.id,
      now(),
      (previous.version || 0) + 1,
    );
    await log(u, `Uploaded ${name}`, recordId || undefined);
    return Response.json({ ok: true, id: fid });
  } catch (e) {
    return responseError(e);
  }
}
export async function GET(req: Request) {
  try {
    const u = await session(req),
      url = new URL(req.url),
      fid = url.searchParams.get('id');
    const f = await one(
      'SELECT * FROM files WHERE id=? AND organization_id=?',
      fid,
      u.organization_id,
    );
    if (!f) fail('Document not found.', 404);
    if (u.role === 'Employee' && f.uploaded_by !== u.id) {
      const r = f.record_id
        ? await record(u.organization_id, f.record_id)
        : null;
      const org = await one(
        'SELECT profile FROM organizations WHERE id=?',
        u.organization_id,
      );
      if (r?.owner_id !== u.id && JSON.parse(org.profile).logo !== f.id)
        fail('You cannot access this document.', 403);
    }
    const object = await bucket().get(`${u.organization_id}/${f.id}`);
    if (!object) fail('Document is unavailable.', 404);
    const inline =
      url.searchParams.get('preview') === '1' &&
      ['application/pdf', 'image/png', 'image/jpeg'].includes(f.type);
    return new Response(object.body, {
      headers: {
        'Content-Type': f.type,
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${f.name}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'",
      },
    });
  } catch (e) {
    return responseError(e);
  }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    const u = await session(req),
      { id: fid } = (await req.json()) as any;
    const f = await one(
      'SELECT * FROM files WHERE id=? AND organization_id=?',
      fid,
      u.organization_id,
    );
    if (!f) fail('Document not found.', 404);
    if (!managers.includes(u.role) && f.uploaded_by !== u.id)
      fail('You cannot delete this document.', 403);
    if (f.record_id) {
      const r = await record(u.organization_id, f.record_id);
      if (
        [
          'Awaiting Approval',
          'Completed',
          'Submitted',
          'Under Review',
          'Implemented',
          'Verified',
          'Closed',
        ].includes(r.status)
      )
        fail('Evidence is locked while under review or after approval.');
    }
    const refs = await all(
      'SELECT data FROM records WHERE organization_id=?',
      u.organization_id,
    );
    const org = await one(
      'SELECT profile FROM organizations WHERE id=?',
      u.organization_id,
    );
    if (refs.some((r) => r.data.includes(fid)) || org.profile.includes(fid))
      fail(
        'This file is linked to a logo or before/after image. Replace that reference before deleting.',
      );
    await bucket().delete(`${u.organization_id}/${fid}`);
    await run(
      'DELETE FROM files WHERE id=? AND organization_id=?',
      fid,
      u.organization_id,
    );
    await log(u, `Deleted ${f.name}`, f.record_id);
    return Response.json({ ok: true });
  } catch (e) {
    return responseError(e);
  }
}

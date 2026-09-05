import { suggestRequirements } from '@/lib/applicability';
import { z } from 'zod';
import {
  id,
  one,
  all,
  run,
  insert,
  update,
  record,
  session,
  permit,
  managers,
  experts,
  reviewers,
  log,
  notify,
  today,
  now,
  fail,
  responseError,
  sameOrigin,
  passwordHash,
} from '@/lib/server';
import { roleNames } from '@/lib/seed';
const kinds = [
  'requirement',
  'task',
  'audit',
  'kaizen',
  'action',
  'licence',
  'compliance-template',
  'audit-template',
  'settings',
  'guidance',
];
const input = z
  .object({ title: z.string().trim().min(1, 'A name is required.').max(250) })
  .loose();
const publicUser = (u: any) => {
  const { password: _password, recovery: _recovery, ...rest } = u;
  return { ...rest, ...JSON.parse(u.details || '{}') };
};
async function authorizeRecord(u: any, r: any) {
  if (u.role === 'Employee' && r.owner_id !== u.id && r.kind !== 'notification')
    fail('This record is not assigned to you.', 403);
}
async function reminders(u: any) {
  const settings = await one(
    'SELECT data FROM records WHERE organization_id=? AND kind=?',
    u.organization_id,
    'settings',
  );
  const rules = JSON.parse(settings?.data || '{}');
  if (rules.notifications === false) return;
  const rows = await all(
    'SELECT * FROM records WHERE organization_id=? AND kind IN (?,?)',
    u.organization_id,
    'task',
    'licence',
  );
  for (const raw of rows) {
    const r = { ...JSON.parse(raw.data), ...raw };
    if (['Completed', 'Closed'].includes(r.status)) continue;
    const date = r.kind === 'licence' ? r.expiry : r.due;
    if (!date) continue;
    const days = Math.ceil(
      (new Date(date).getTime() - new Date(today()).getTime()) / 86400000,
    );
    const schedule = String(
      r.kind === 'licence'
        ? rules.licence_alerts || '90,60,30,15,7'
        : rules.reminders || '15,7,2,0',
    )
      .split(',')
      .map(Number);
    const escalations = String(rules.escalations || '1,3,7')
      .split(',')
      .map(Number);
    if (!schedule.includes(days) && !escalations.includes(-days)) continue;
    let owner = r.owner_id;
    if (days < 0 && -days >= escalations[1]) {
      const escalation = await one(
        'SELECT id FROM users WHERE organization_id=? AND role=?',
        u.organization_id,
        -days >= escalations[2] ? 'Owner' : 'Compliance Manager',
      );
      owner = escalation?.id || owner;
    }
    const nid = `reminder-${r.id}-${today()}`;
    await run(
      'INSERT OR IGNORE INTO records(id,organization_id,kind,owner_id,status,data,updated,version) VALUES(?,?,?,?,?,?,?,1)',
      nid,
      u.organization_id,
      'notification',
      owner,
      'Unread',
      JSON.stringify({
        title: `${JSON.parse(raw.data).title}: ${days < 0 ? `${-days} days overdue` : days === 0 ? 'due today' : `due in ${days} days`}`,
        parent_id: r.id,
        date: now(),
      }),
      now(),
    );
  }
}
export async function GET(req: Request) {
  try {
    const u = await session(req);
    await reminders(u);
    const company = await one(
      'SELECT * FROM organizations WHERE id=?',
      u.organization_id,
    );
    let records = (
      await all(
        'SELECT * FROM records WHERE organization_id=? ORDER BY updated DESC',
        u.organization_id,
      )
    ).map((r) => ({ ...JSON.parse(r.data), ...r, data: undefined }));
    if (u.role === 'Employee')
      records = records.filter(
        (r) => r.owner_id === u.id || ['settings', 'activity'].includes(r.kind),
      );
    const files = await all(
      'SELECT * FROM files WHERE organization_id=? ORDER BY created DESC',
      u.organization_id,
    );
    const visibleFiles =
      u.role === 'Employee'
        ? files.filter(
            (f) =>
              f.uploaded_by === u.id ||
              records.some((r) => r.id === f.record_id) ||
              f.id === JSON.parse(company.profile).logo,
          )
        : files;
    return Response.json(
      {
        user: publicUser(u),
        company: {
          ...JSON.parse(company.profile),
          id: company.id,
          name: company.name,
          demo: !!company.demo,
        },
        users: (
          await all(
            'SELECT * FROM users WHERE organization_id=?',
            u.organization_id,
          )
        ).map(publicUser),
        records,
        files: visibleFiles,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return responseError(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await session(req),
      b = (await req.json()) as any,
      org = u.organization_id;
    if (b.action === 'company') {
      permit(u, managers);
      const profile = input.parse({ ...b.data, title: b.data.name });
      if (
        profile.logo &&
        !(await one(
          "SELECT id FROM files WHERE id=? AND organization_id=? AND type IN ('image/png','image/jpeg')",
          profile.logo,
          org,
        ))
      )
        fail('Select an uploaded company logo.');
      if (Number(profile.employees) < 0)
        fail('Employee count cannot be negative.');
      await run(
        'UPDATE organizations SET name=?,profile=? WHERE id=?',
        profile.name,
        JSON.stringify(profile),
        org,
      );
      await suggestRequirements(
        org,
        profile,
        u.id,
        (
          await one(
            "SELECT id FROM users WHERE organization_id=? AND role IN ('Reviewer','Owner') ORDER BY role DESC LIMIT 1",
            org,
          )
        )?.id || u.id,
      );
      await log(u, 'Company profile updated');
      return Response.json({ ok: true });
    }
    if (b.action === 'user') {
      permit(u, ['Owner', 'MCCIA Administrator']);
      const d = b.data;
      z.email().parse(d.email);
      if (!d.name?.trim() || !roleNames.includes(d.role))
        fail('Name and a valid role are required.');
      if (d.role === 'MCCIA Administrator' && !u.demo)
        fail('Platform administrator accounts require platform provisioning.');
      if (d.id) {
        const existing = await one(
          'SELECT * FROM users WHERE id=? AND organization_id=?',
          d.id,
          org,
        );
        if (!existing) fail('User not found.', 404);
        if (
          existing.id === u.id &&
          (d.status !== 'Active' || d.role !== u.role)
        )
          fail('You cannot deactivate or change your own role.');
        await run(
          'UPDATE users SET name=?,role=?,status=?,details=? WHERE id=? AND organization_id=?',
          d.name,
          d.role,
          d.status || 'Active',
          JSON.stringify({
            department: d.department,
            mobile: d.mobile,
            designation: d.designation,
          }),
          d.id,
          org,
        );
      } else {
        if (!d.password || d.password.length < 10)
          fail('Set a temporary password of at least 10 characters.');
        if (
          await one('SELECT id FROM users WHERE email=?', d.email.toLowerCase())
        )
          fail('Email already registered.');
        await run(
          'INSERT INTO users(id,organization_id,email,name,role,password,status,details) VALUES(?,?,?,?,?,?,?,?)',
          id(),
          org,
          d.email.toLowerCase(),
          d.name,
          d.role,
          await passwordHash(d.password),
          'Active',
          JSON.stringify({
            department: d.department,
            mobile: d.mobile,
            designation: d.designation,
          }),
        );
      }
      await log(u, 'Team member updated');
      return Response.json({ ok: true });
    }
    if (b.action === 'read-notifications') {
      await run(
        "UPDATE records SET status='Read' WHERE organization_id=? AND kind='notification' AND (owner_id IS NULL OR owner_id=?)",
        org,
        u.id,
      );
      return Response.json({ ok: true });
    }
    if (b.action === 'create') {
      if (!kinds.includes(b.kind)) fail('Invalid record type.');
      if (
        [
          'requirement',
          'task',
          'licence',
          'compliance-template',
          'audit-template',
          'settings',
        ].includes(b.kind)
      )
        permit(u, managers);
      else if (b.kind !== 'guidance')
        permit(u, [...managers, 'Auditor', 'Expert']);
      const d = input.parse(b.data) as any;
      if (d.start && d.due && d.due < d.start)
        fail('Due date cannot be before task start date.');
      if (
        ['task', 'audit', 'kaizen', 'action', 'requirement'].includes(b.kind) &&
        (!d.owner_id || !d.reviewer_id || !d.due)
      )
        fail('Select an owner, reviewer and due date.');
      for (const key of ['owner_id', 'reviewer_id'])
        if (
          d[key] &&
          !(await one(
            'SELECT id FROM users WHERE id=? AND organization_id=? AND status=?',
            d[key],
            org,
            'Active',
          ))
        )
          fail('Select an active team member.');
      if (d.parent_id) await record(org, d.parent_id);
      const status =
        b.kind === 'requirement'
          ? 'Pending Verification'
          : b.kind === 'task'
            ? 'Not Started'
            : b.kind === 'kaizen'
              ? 'Proposed'
              : b.kind === 'action'
                ? 'Open'
                : b.kind === 'audit'
                  ? 'Draft'
                  : 'Active';
      if (b.kind === 'task') {
        if (!d.requirement_id)
          fail('Choose a verified compliance requirement.');
        const requirement = await record(org, d.requirement_id);
        if (
          requirement.kind !== 'requirement' ||
          requirement.status !== 'Verified'
        )
          fail('Only verified requirements can create tasks.');
        d.checklist = (d.checklist || requirement.checklist || []).map(
          (text: any) => ({
            text: typeof text === 'string' ? text : text.text,
            done: false,
          }),
        );
      }
      if (b.kind === 'audit') {
        const template = d.template_id
          ? await record(org, d.template_id)
          : null;
        d.questions = (
          template?.questions || [
            {
              title: 'Review requirement and evidence',
              type: 'Assessment',
              required: true,
              weight: 1,
            },
          ]
        ).map((q: any) => ({ ...q, assessment: '', observation: '' }));
      }
      const rid = await insert(org, b.kind, { ...d, status });
      await log(u, `${b.kind} created: ${d.title}`, rid);
      return Response.json({ ok: true, id: rid });
    }
    const r = await record(org, b.id);
    await authorizeRecord(u, r);
    if (b.version !== undefined && b.version !== r.version)
      fail('Record changed. Refresh before saving.', 409);
    if (b.action === 'save') {
      if (
        [
          'requirement',
          'compliance-template',
          'audit-template',
          'licence',
          'settings',
        ].includes(r.kind)
      )
        permit(
          u,
          r.kind === 'requirement' ? [...managers, ...experts] : managers,
        );
      else if (
        !managers.includes(u.role) &&
        r.owner_id !== u.id &&
        r.reviewer_id !== u.id &&
        !experts.includes(u.role)
      )
        fail('You cannot edit this record.', 403);
      if (
        ['Completed', 'Closed', 'Verified', 'Awaiting Approval', 'Submitted', 'Under Review', 'Implemented'].includes(r.status) &&
        r.kind !== 'requirement'
      )
        fail('Submitted or verified records are locked. Return the work for correction before editing.');
      const d = { ...b.data };
      if (d.logo) {
        const logo = await one(
          'SELECT type FROM files WHERE id=? AND organization_id=?',
          d.logo,
          org,
        );
        if (!logo || !['image/png', 'image/jpeg'].includes(logo.type))
          fail('Select a company-owned PNG or JPG logo.');
      }
      for (const key of ['owner_id', 'reviewer_id'])
        if (
          d[key] &&
          !(await one(
            'SELECT id FROM users WHERE id=? AND organization_id=? AND status=?',
            d[key],
            org,
            'Active',
          ))
        )
          fail('Select an active team member from this organization.');
      for (const key of ['before_image', 'after_image', 'evidence_reference'])
        if (
          d[key] &&
          !(await one(
            'SELECT id FROM files WHERE id=? AND organization_id=? AND record_id=?',
            d[key],
            org,
            r.id,
          ))
        )
          fail('Select evidence uploaded to this record.');
      for (const key of [
        'id',
        'organization_id',
        'kind',
        'status',
        'version',
        'data',
        'history',
        'verification',
        'approval',
        'verified_by',
      ])
        delete d[key];
      if (!managers.includes(u.role)) {
        delete d.owner_id;
        delete d.reviewer_id;
      }
      if (d.start && d.due && d.due < d.start)
        fail('Due date cannot be before start date.');
      if (d.title !== undefined) input.parse(d);
      await update(r, d);
      await log(u, `Saved ${r.title}`, r.id);
    } else if (b.action === 'verify-requirement') {
      permit(u, experts);
      if (r.kind !== 'requirement') fail('Select a compliance requirement.');
      if (
        !['Applicable', 'Not Applicable', 'Needs Clarification'].includes(
          b.decision,
        )
      )
        fail('Select an applicability decision.');
      if (!b.remarks?.trim() || !b.source?.trim())
        fail('Expert remarks and source are required.');
      if (
        b.decision === 'Applicable' &&
        (!r.due || !r.owner_id || !r.reviewer_id)
      )
        fail('Set a due date, owner and reviewer first.');
      await update(r, {
        status:
          b.decision === 'Applicable'
            ? 'Verified'
            : b.decision === 'Not Applicable'
              ? 'Not Applicable'
              : 'Needs Review',
        applicability: b.decision,
        remarks: b.remarks,
        source: b.source,
        review_date: today(),
        verified_by: u.name,
      });
      if (
        b.decision === 'Applicable' &&
        !(await one(
          "SELECT id FROM records WHERE organization_id=? AND kind='task' AND parent_id=?",
          org,
          r.id,
        ))
      )
        await insert(org, 'task', {
          ...r,
          id: undefined,
          requirement_id: r.id,
          parent_id: r.id,
          status: 'Not Started',
          checklist: (r.checklist || []).map((q: any) => ({
            text: typeof q === 'string' ? q : q.text,
            done: false,
          })),
          history: [
            {
              actor: u.name,
              text: 'Task generated from verified requirement',
              date: now(),
            },
          ],
        });
      await log(u, `Applicability reviewed: ${r.title}`, r.id);
    } else if (b.action === 'comment') {
      if (!b.text?.trim()) fail('Enter a comment.');
      await insert(org, 'comment', {
        title: b.text,
        actor: u.name,
        parent_id: r.id,
        status: 'Posted',
        date: now(),
      });
      await log(u, `Comment added to ${r.title}`, r.id);
    } else if (b.action === 'transition') {
      const next = b.status;
      const evidence = await all(
        'SELECT id FROM files WHERE organization_id=? AND record_id=?',
        org,
        r.id,
      );
      const owner = managers.includes(u.role) || r.owner_id === u.id;
      const review =
        reviewers.includes(u.role) &&
        (managers.includes(u.role) ||
          r.reviewer_id === u.id ||
          experts.includes(u.role));
      const transitions: Record<string, Record<string, string[]>> = {
        task: {
          'Not Started': ['In Progress', 'Awaiting Approval'],
          'In Progress': ['Awaiting Approval'],
          Returned: ['In Progress', 'Awaiting Approval'],
          'Awaiting Approval': ['Completed', 'Returned'],
        },
        audit: {
          Draft: ['Scheduled', 'In Progress'],
          Scheduled: ['In Progress'],
          'In Progress': ['Submitted'],
          Submitted: ['Under Review', 'In Progress'],
          'Under Review': ['Closed', 'In Progress'],
        },
        kaizen: {
          Proposed: ['In Progress'],
          'In Progress': ['Implemented'],
          Implemented: ['Verified'],
          Verified: ['Closed'],
        },
        action: {
          Open: ['Assigned', 'In Progress'],
          Assigned: ['In Progress'],
          'In Progress': ['Pending Verification'],
          'Pending Verification': ['Closed', 'In Progress'],
        },
      };
      if (!transitions[r.kind]?.[r.status]?.includes(next))
        fail('That status transition is not allowed.');
      const approval =
        [
          'Completed',
          'Returned',
          'Under Review',
          'Closed',
          'Verified',
        ].includes(next) ||
        (r.kind === 'audit' && r.status === 'Submitted');
      if (approval && !review)
        fail('Only an authorized reviewer can perform this action.', 403);
      if (!approval && !owner && !experts.includes(u.role))
        fail('Only the assigned owner can submit work.', 403);
      if (next === 'Awaiting Approval') {
        if (
          !(r.checklist || []).length ||
          r.checklist.some((q: any) => !q.done)
        )
          fail('Complete every required checklist step.');
        if (!evidence.length) fail('Please upload supporting evidence.');
        if (!r.filing_date || !r.acknowledgement)
          fail('Filing date and acknowledgement number are required.');
      }
      if (next === 'Returned' && !b.comment?.trim())
        fail('A correction comment is required.');
      if (r.kind === 'audit' && next === 'Submitted') {
        if (
          !r.questions?.length ||
          r.questions.some(
            (q: any) => q.required !== false && !(q.assessment || q.answer),
          )
        )
          fail('Complete all required audit questions.');
        for (const q of r.questions.filter((q: any) =>
          ['Non-Compliant', 'Partially Compliant'].includes(q.assessment),
        )) {
          if (!q.observation || !q.action || !q.owner_id || !q.due)
            fail(
              'Each finding needs an observation, corrective action, owner and target date.',
            );
          if (
            !(await one(
              "SELECT id FROM records WHERE organization_id=? AND kind='action' AND parent_id=? AND json_extract(data,'$.title')=?",
              org,
              r.id,
              q.action,
            ))
          )
            await insert(org, 'action', {
              title: q.action,
              observation: q.observation,
              parent_id: r.id,
              source: 'Compliance Audit',
              owner_id: q.owner_id,
              reviewer_id: r.reviewer_id,
              due: q.due,
              priority: q.risk || 'Medium',
              status: 'Open',
              likelihood: q.likelihood || 2,
              impact: q.impact || 2,
            });
        }
      }
      if (r.kind === 'kaizen' && next === 'Implemented') {
        if (
          !r.problem ||
          !r.root_cause ||
          !r.improvement ||
          !r.before_image ||
          !r.after_image
        )
          fail(
            'Complete the problem, root cause, improvement and before/after images.',
          );
        if (
          !(await one(
            "SELECT id FROM records WHERE organization_id=? AND kind='action' AND parent_id=?",
            org,
            r.id,
          ))
        )
          await insert(org, 'action', {
            title: r.proposed_action || r.title,
            parent_id: r.id,
            source: 'Kaizen Audit',
            owner_id: r.owner_id,
            reviewer_id: r.reviewer_id,
            due: r.due,
            status: 'Pending Verification',
            priority: 'Medium',
            evidence_reference: r.after_image,
          });
      }
      if (
        r.kind === 'action' &&
        ['Pending Verification', 'Closed'].includes(next) &&
        !evidence.length &&
        !r.evidence_reference
      )
        fail('Upload evidence before submitting or verifying this action.');
      if (['Verified', 'Closed'].includes(next) && !b.comment?.trim())
        fail('Verification remarks are required.');
      if (['audit', 'kaizen'].includes(r.kind) && next === 'Closed') {
        const open = await one(
          "SELECT count(*) n FROM records WHERE organization_id=? AND kind='action' AND parent_id=? AND status!='Closed'",
          org,
          r.id,
        );
        if (open.n)
          fail('Verify and close all linked corrective actions first.');
      }
      const history = [
        ...(r.history || []),
        {
          date: now(),
          actor: u.name,
          text: `${r.status} → ${next}`,
          comment: b.comment || '',
        },
      ];
      await update(r, {
        status: next,
        history,
        ...(approval
          ? {
              verified_by: u.name,
              verification_date: today(),
              verification_remarks: b.comment || '',
            }
          : {}),
      });
      await log(u, `${r.title}: ${next}`, r.id);
      await notify(
        org,
        `${r.title}: ${next}${b.comment ? ' — ' + b.comment : ''}`,
        approval ? r.owner_id : r.reviewer_id,
        r.id,
      );
      if (
        r.kind === 'task' &&
        next === 'Completed' &&
        ['Monthly', 'Quarterly', 'Half-Yearly', 'Annual'].includes(r.frequency)
      ) {
        const nextDate = new Date(r.due + 'T12:00:00Z');
        const originalDay = nextDate.getUTCDate();
        nextDate.setUTCDate(1);
        nextDate.setUTCMonth(
          nextDate.getUTCMonth() +
            ({ Monthly: 1, Quarterly: 3, 'Half-Yearly': 6, Annual: 12 }[
              r.frequency as string
            ] || 1),
        );
        const last = new Date(
          Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, 0),
        ).getUTCDate();
        nextDate.setUTCDate(Math.min(originalDay, last));
        const due = nextDate.toISOString().slice(0, 10);
        if (
          !(await one(
            "SELECT id FROM records WHERE organization_id=? AND kind='task' AND parent_id=? AND json_extract(data,'$.due')=?",
            org,
            r.parent_id || r.id,
            due,
          ))
        )
          await insert(org, 'task', {
            title: r.title,
            category: r.category,
            department: r.department,
            owner_id: r.owner_id,
            reviewer_id: r.reviewer_id,
            parent_id: r.parent_id || r.id,
            requirement_id: r.requirement_id,
            frequency: r.frequency,
            due,
            priority: r.priority,
            status: 'Not Started',
            checklist: r.checklist.map((q: any) => ({ ...q, done: false })),
          });
      }
    } else fail('Unknown workspace action.');
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json({ error: e.issues[0].message }, { status: 400 });
    return responseError(e);
  }
}

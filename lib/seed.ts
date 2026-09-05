import { id, run, insert, today, now } from './server';
export const roleNames = [
  'Owner',
  'Compliance Manager',
  'Employee',
  'Reviewer',
  'Expert',
  'Auditor',
  'MCCIA Administrator',
];
export async function seedOrganization(
  org: string,
  owner: string,
  demo: boolean,
) {
  const users = [
    {
      id: owner,
      name: 'Aarav Deshmukh',
      role: 'Owner',
      department: 'Management',
    },
    ...[
      'Compliance Manager',
      'Employee',
      'Reviewer',
      'Expert',
      'Auditor',
      'MCCIA Administrator',
    ].map((role, i) => ({
      id: id(),
      role,
      name: [
        'Neha Kulkarni',
        'Rohan Patil',
        'Priya Shah',
        'CA Meera Joshi',
        'Sanjay Kulkarni',
        'MCCIA Demo Admin',
      ][i],
      department: [
        'Compliance',
        'Accounts',
        'Finance',
        'Advisory',
        'Quality',
        'MCCIA',
      ][i],
    })),
  ];
  if (demo)
    for (const u of users.slice(1))
      await run(
        'INSERT INTO users(id,organization_id,email,name,role,password,status,details) VALUES(?,?,?,?,?,?,?,?)',
        u.id,
        org,
        `${u.id}@demo.invalid`,
        u.name,
        u.role,
        'disabled',
        'Active',
        JSON.stringify({ department: u.department }),
      );
  const assignee = demo ? users[2].id : owner,
    reviewer = demo ? users[3].id : owner;
  const templates = [
    ['GSTR-3B filing', 'GST', 'Monthly', 'GST', 'Accounts'],
    ['PF contribution & return', 'Labour', 'Monthly', 'EPFO', 'HR'],
    ['ESIC contribution', 'Labour', 'Monthly', 'ESIC', 'HR'],
    ['TDS return reconciliation', 'Tax', 'Quarterly', 'Income Tax', 'Finance'],
    [
      'Factory licence renewal',
      'Factory',
      'Renewal-Based',
      'Directorate of Industrial Safety',
      'Operations',
    ],
    [
      'Consent to operate review',
      'Environment',
      'Annual',
      'MPCB',
      'Operations',
    ],
    ['Fire safety inspection', 'Safety', 'Annual', 'Fire Department', 'Admin'],
    ['Annual corporate filings', 'Corporate', 'Annual', 'MCA', 'Legal'],
  ];
  for (const [title, category, frequency, authority, department] of templates) {
    const template = await insert(org, 'compliance-template', {
      title,
      category,
      frequency,
      authority,
      department,
      status: 'Active',
      due_rule: 'Expert to confirm applicable date',
      checklist: [
        'Prepare records',
        'Review supporting documents',
        'Complete required filing',
        'Upload acknowledgement',
      ],
    });
    await insert(org, 'requirement', {
      title,
      category,
      frequency,
      authority,
      department,
      template_id: template,
      owner_id: assignee,
      reviewer_id: reviewer,
      status: 'Pending Verification',
      due: today(),
      checklist: [
        'Prepare records',
        'Review supporting documents',
        'Complete required filing',
        'Upload acknowledgement',
      ],
      applicability: 'Potentially Applicable',
    });
  }
  await insert(org, 'audit-template', {
    title: 'Internal compliance audit',
    status: 'Active',
    questions: [
      {
        title: 'Required filings are complete',
        type: 'Assessment',
        required: true,
        weight: 1,
      },
      {
        title: 'Evidence is current and available',
        type: 'Assessment',
        required: true,
        weight: 1,
      },
      {
        title: 'Responsible persons are assigned',
        type: 'Assessment',
        required: true,
        weight: 1,
      },
    ],
  });
  await insert(org, 'settings', {
    title: 'Workspace settings',
    status: 'Active',
    departments:
      'Finance, Accounts, HR, Admin, Legal, Operations, Production, Quality, Maintenance, Stores, Purchase, Sales',
    locations: 'Pune, Chakan',
    reminders: '15,7,2,0',
    escalations: '1,3,7',
    licence_alerts: '90,60,30,15,7',
    notifications: true,
  });
  if (!demo) return;
  const date = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const names = [
    'GST reconciliation',
    'GSTR-3B filing',
    'PF contribution & return',
    'TDS payment reconciliation',
    'ESIC contribution',
    'Factory licence review',
    'Fire safety inspection',
    'MPCB consent review',
    'Professional tax return',
    'Annual corporate filings',
    'Contract labour register',
    'Employee attendance register',
  ];
  for (let i = 0; i < names.length; i++)
    await insert(org, 'task', {
      title: names[i],
      category: [
        'GST',
        'GST',
        'Labour',
        'Tax',
        'Labour',
        'Factory',
        'Safety',
        'Environment',
        'Tax',
        'Corporate',
        'Labour',
        'HR',
      ][i],
      department: i % 3 ? 'Accounts' : 'HR',
      owner_id: assignee,
      reviewer_id: reviewer,
      status:
        i < 4 ? 'Completed' : i === 4 ? 'Awaiting Approval' : 'Not Started',
      due: date(i === 5 ? -3 : i - 3),
      start: date(-15),
      priority: i === 5 ? 'High' : 'Medium',
      period: 'Current reporting period',
      description:
        'Demo tracking requirement. Dates are illustrative and require expert confirmation.',
      frequency: 'Monthly',
      checklist: [
        { text: 'Prepare records', done: i < 5 },
        { text: 'Reconcile and review', done: i < 5 },
        { text: 'Upload acknowledgement', done: i < 5 },
      ],
      history: [{ date: now(), actor: 'System', text: 'Demo task created' }],
    });
  const audit = await insert(org, 'audit', {
    title: 'Q3 statutory compliance review',
    department: 'Finance',
    location: 'Pune',
    type: 'Statutory Compliance',
    period: 'Q3 2026',
    start: date(-3),
    due: date(7),
    owner_id: users[5].id,
    reviewer_id: reviewer,
    status: 'In Progress',
    questions: [
      {
        title: 'GST filing evidence',
        assessment: 'Partially Compliant',
        observation: 'Acknowledgement is missing',
        risk: 'Medium',
        weight: 1,
      },
      {
        title: 'Employee statutory register',
        assessment: 'Compliant',
        risk: 'Low',
        weight: 1,
      },
    ],
  });
  await insert(org, 'action', {
    title: 'Upload missing GST acknowledgement',
    parent_id: audit,
    source: 'Compliance Audit',
    owner_id: assignee,
    reviewer_id: reviewer,
    status: 'Open',
    due: date(5),
    priority: 'High',
    observation: 'Filing proof is not in the repository',
    likelihood: 3,
    impact: 3,
  });
  await insert(org, 'kaizen', {
    title: 'Reduce machine changeover time',
    department: 'Production',
    area: 'CNC line 2',
    owner_id: assignee,
    reviewer_id: reviewer,
    status: 'In Progress',
    due: date(10),
    category: 'Productivity',
    problem: 'Average changeover takes 42 minutes',
    current: 'Tools are located across several workstations',
    root_cause: 'No standard setup sequence',
    root_category: 'Method',
    improvement: 'Introduce a pre-staged tool trolley and setup checklist',
    proposed_action: 'Pilot the trolley on CNC line 2',
    expected_result: 'Reduce changeover time to 25 minutes',
    expected_savings: 180000,
    actual_savings: 0,
  });
  await insert(org, 'licence', {
    title: 'Factory licence',
    authority: 'Directorate of Industrial Safety',
    number: 'DEMO-MH-2026-041',
    issue: date(-300),
    expiry: date(75),
    due: date(45),
    frequency: 'Annual',
    owner_id: assignee,
    status: 'Active',
  });
  await insert(org, 'licence', {
    title: 'Fire safety certificate',
    authority: 'Local Fire Authority',
    number: 'DEMO-FSC-026',
    issue: date(-330),
    expiry: date(30),
    due: date(15),
    owner_id: assignee,
    status: 'Renewal Due',
  });
  await insert(org, 'activity', {
    title: 'Q3 statutory compliance review started',
    actor: 'Sanjay Kulkarni',
    status: 'Recorded',
    date: now(),
  });
  await insert(org, 'notification', {
    title: 'Factory licence review is overdue. Assign a follow-up today.',
    status: 'Unread',
    date: now(),
  });
}

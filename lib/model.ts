export const roles = [
  'Owner',
  'Compliance Manager',
  'Employee',
  'Reviewer',
  'Expert',
  'Auditor',
  'MCCIA Administrator',
];
export const frequencies = [
  'Monthly',
  'Quarterly',
  'Half-Yearly',
  'Annual',
  'One-Time',
  'Renewal-Based',
  'Event-Based',
];
export const categories = [
  'GST',
  'Tax',
  'HR',
  'Labour',
  'Factory',
  'Environment',
  'Safety',
  'Corporate',
  'Licences',
  'Audit',
  'Company',
  'Other',
];
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
};
const f = (
  key: string,
  label: string,
  type = 'text',
  required = false,
  options?: string[],
): Field => ({ key, label, type, required, options });
const common = [
  f('title', 'Name', 'text', true),
  f('department', 'Department'),
  f('owner_id', 'Responsible person', 'user', true),
  f('reviewer_id', 'Reviewer', 'user', true),
  f('due', 'Due date', 'date', true),
];
export const fields: Record<string, Field[]> = {
  requirement: [
    ...common,
    f('category', 'Category', 'select', true, categories),
    f('frequency', 'Frequency', 'select', true, frequencies),
    f('authority', 'Authority'),
    f('due_rule', 'Due date rule'),
    f('applicable_to', 'Applicable to'),
    f('description', 'Applicability notes', 'textarea'),
    f('checklist', 'Checklist (one step per line)', 'lines'),
  ],
  task: [
    ...common,
    f('requirement_id', 'Verified requirement', 'requirement', true),
    f('category', 'Category', 'select', false, categories),
    f('start', 'Start date', 'date'),
    f('period', 'Applicable period'),
    f('priority', 'Priority', 'select', true, [
      'Low',
      'Medium',
      'High',
      'Critical',
    ]),
    f('description', 'Description', 'textarea'),
    f('frequency', 'Frequency', 'select', true, frequencies),
  ],
  audit: [
    ...common,
    f('template_id', 'Audit template', 'template'),
    f('location', 'Location'),
    f('type', 'Audit type', 'select', true, [
      'Statutory Compliance',
      'Labour Compliance',
      'GST / Tax',
      'Factory Compliance',
      'Environmental',
      'Safety',
      'Licence Audit',
      'Internal Process Audit',
      'Custom',
    ]),
    f('period', 'Audit period'),
    f('start', 'Start date', 'date'),
  ],
  kaizen: [
    ...common,
    f('area', 'Area'),
    f('audit_date', 'Audit date', 'date'),
    f('category', 'Problem category', 'select', false, [
      'Quality',
      'Cost',
      'Delivery',
      'Safety',
      'Productivity',
      'Energy',
      'Waste',
      'Inventory',
      'Process',
      'Other',
    ]),
    f('problem', 'Problem statement', 'textarea', true),
    f('current', 'Current condition', 'textarea'),
    f('root_cause', 'Root cause', 'textarea'),
    f('root_category', 'Root cause category', 'select', false, [
      'Man',
      'Machine',
      'Material',
      'Method',
      'Measurement',
      'Environment',
      'Other',
    ]),
    f('improvement', 'Improvement idea', 'textarea'),
    f('proposed_action', 'Proposed action', 'textarea'),
    f('expected_result', 'Expected result', 'textarea'),
    f('before_condition', 'Before condition', 'textarea'),
    f('after_condition', 'After condition', 'textarea'),
    f('benefit', 'Benefit', 'select', false, [
      'Cost Reduction',
      'Time Saving',
      'Quality Improvement',
      'Productivity Improvement',
      'Safety Improvement',
      'Energy Saving',
      'Waste Reduction',
      'Other',
    ]),
    f('expected_savings', 'Estimated savings (INR)', 'number'),
    f('actual_savings', 'Actual savings (INR)', 'number'),
    f('time_saved', 'Time saved (hours/month)', 'number'),
    f('auditor_comments', 'Auditor comments', 'textarea'),
  ],
  action: [
    ...common,
    f('source', 'Source', 'select', false, [
      'Compliance Audit',
      'Kaizen Audit',
      'Internal Review',
      'Management Review',
    ]),
    f('priority', 'Priority', 'select', false, [
      'Low',
      'Medium',
      'High',
      'Critical',
    ]),
    f('observation', 'Finding / observation', 'textarea'),
    f('likelihood', 'Likelihood (1–5)', 'number'),
    f('impact', 'Impact (1–5)', 'number'),
  ],
  licence: [
    f('title', 'Licence name', 'text', true),
    f('authority', 'Issuing authority', 'text', true),
    f('number', 'Licence number', 'text', true),
    f('issue', 'Issue date', 'date'),
    f('expiry', 'Expiry date', 'date', true),
    f('due', 'Renewal date', 'date', true),
    f('frequency', 'Renewal frequency', 'select', false, frequencies),
    f('owner_id', 'Responsible person', 'user', true),
  ],
  'compliance-template': [
    f('title', 'Compliance name', 'text', true),
    f('category', 'Category', 'select', true, categories),
    f('frequency', 'Frequency', 'select', true, frequencies),
    f('authority', 'Authority'),
    f('applicable_to', 'Applicable to'),
    f('due_rule', 'Due date rule'),
    f('department', 'Responsible department'),
    f('checklist', 'Checklist (one per line)', 'lines'),
  ],
  'audit-template': [
    f('title', 'Template name', 'text', true),
    f('description', 'Description', 'textarea'),
  ],
  guidance: [
    f('title', 'Subject', 'text', true),
    f('category', 'Area of guidance', 'select', false, categories),
    f('description', 'Your question', 'textarea', true),
  ],
  user: [
    f('name', 'Full name', 'text', true),
    f('email', 'Email', 'email', true),
    f('mobile', 'Mobile', 'tel'),
    f('department', 'Department'),
    f('designation', 'Designation'),
    f('role', 'Role', 'select', true, roles),
    f('status', 'Status', 'select', true, ['Active', 'Inactive']),
    f('password', 'Temporary password (new user only)', 'password'),
  ],
  company: [
    f('name', 'Company name', 'text', true),
    f('legal_name', 'Legal name'),
    f('industry', 'Industry'),
    f('business_type', 'Business type'),
    f('structure', 'Company structure', 'select', false, [
      'Private Limited',
      'Public Limited',
      'LLP',
      'Partnership',
      'Proprietorship',
      'Other',
    ]),
    f('address', 'Registered office', 'textarea'),
    f('state', 'State'),
    f('district', 'District'),
    f('additional_locations', 'Additional locations', 'textarea'),
    f('factory_locations', 'Factory locations', 'textarea'),
    f('branch_locations', 'Branch locations', 'textarea'),
    f('turnover', 'Turnover range'),
    f('investment', 'Investment (INR)', 'number'),
    f('stage', 'Business stage'),
    f('employees', 'Total employees', 'number'),
    f('male', 'Male employees', 'number'),
    f('female', 'Female employees', 'number'),
    f('contract', 'Contract workers', 'number'),
    ...[
      'gst',
      'pan',
      'tan',
      'udyam',
      'pf',
      'esic',
      'pt',
      'iec',
      'factory_registration',
      'other_registrations',
    ].map((k) => f(k, k.replaceAll('_', ' ').toUpperCase())),
  ],
  settings: [
    f('departments', 'Departments (comma separated)', 'textarea'),
    f('locations', 'Locations (comma separated)', 'textarea'),
    f('reminders', 'Task reminders (days before due date)'),
    f('escalations', 'Escalation days (employee, manager, owner)'),
    f('licence_alerts', 'Licence alerts (days before expiry)'),
  ],
};
export function taskStatus(r: any) {
  if (r.kind === 'licence') {
    if (r.expiry && r.expiry < new Date().toISOString().slice(0, 10))
      return 'Expired';
    if (r.expiry && new Date(r.expiry).getTime() - Date.now() < 90 * 86400000)
      return 'Renewal Due';
    return r.status;
  }
  if (['Closed', 'Verified', 'Pending Verification'].includes(r.status))
    return r.status;
  if (['Completed', 'Awaiting Approval', 'Returned'].includes(r.status))
    return r.status;
  if (r.due && r.due < new Date().toISOString().slice(0, 10)) return 'Overdue';
  if (r.due && new Date(r.due).getTime() - Date.now() < 7 * 86400000)
    return 'Due Soon';
  return r.status;
}
export function dateLabel(s: string) {
  return s
    ? new Date(s.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
}
export function auditScore(r: any) {
  const q = (r.questions || []).filter(
    (x: any) => x.assessment && x.assessment !== 'Not Applicable',
  );
  const weight = q.reduce(
    (n: number, x: any) => n + (Number(x.weight) || 1),
    0,
  );
  return weight
    ? Math.round(
        q.reduce(
          (n: number, x: any) =>
            n +
            (x.assessment === 'Compliant'
              ? 100
              : x.assessment === 'Partially Compliant'
                ? 50
                : 0) *
              (Number(x.weight) || 1),
          0,
        ) / weight,
      )
    : 0;
}

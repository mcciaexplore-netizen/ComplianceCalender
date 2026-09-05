import { all, insert, today } from './server';
export async function suggestRequirements(
  org: string,
  profile: Record<string, any>,
  owner: string,
  reviewer: string,
) {
  const candidates: { title: string; category: string; reason: string }[] = [];
  const add = (title: string, category: string, reason: string) =>
    candidates.push({ title, category, reason });
  if (profile.gst)
    add(
      'GST registration and filing review',
      'GST',
      'GST registration provided',
    );
  if (profile.pan || profile.tan)
    add(
      'Tax deductions and return review',
      'Tax',
      'PAN / TAN registration provided',
    );
  if (Number(profile.employees) > 0) {
    add(
      'Labour and employment compliance review',
      'Labour',
      'Employees recorded',
    );
    add(
      'PF applicability review',
      'Labour',
      'Employee profile requires expert assessment',
    );
    add(
      'ESIC applicability review',
      'Labour',
      'Employee profile requires expert assessment',
    );
    add(
      'Professional tax applicability review',
      'Tax',
      'Employee profile requires state-specific assessment',
    );
  }
  if (
    /manufactur|engineer|factory/i.test(String(profile.industry || '')) ||
    profile.factory_registration
  ) {
    add(
      'Factory compliance review',
      'Factory',
      'Manufacturing or factory registration recorded',
    );
    add(
      'Environmental permission review',
      'Environment',
      'Manufacturing activity recorded',
    );
    add('Fire safety licence review', 'Safety', 'Factory premises recorded');
  }
  if (/food|beverage|restaurant/i.test(String(profile.industry || '')))
    add(
      'FSSAI applicability review',
      'Licences',
      'Food-related activity recorded',
    );
  if (profile.iec)
    add(
      'Import / export compliance review',
      'Corporate',
      'IEC registration provided',
    );
  if (/limited|llp/i.test(String(profile.structure || '')))
    add(
      'Corporate filing applicability review',
      'Corporate',
      'Company / LLP structure recorded',
    );
  if (profile.address)
    add(
      'Trade and establishment licence review',
      'Licences',
      'Business premises recorded',
    );
  const existing = await all(
    "SELECT data FROM records WHERE organization_id=? AND kind='requirement'",
    org,
  );
  for (const c of candidates)
    if (!existing.some((r) => JSON.parse(r.data).title === c.title))
      await insert(org, 'requirement', {
        ...c,
        status: 'Pending Verification',
        applicability: 'Potentially Applicable',
        description:
          c.reason +
          '. Expert confirmation is required; no legal determination has been made.',
        owner_id: owner,
        reviewer_id: reviewer,
        due: today(),
        frequency: 'One-Time',
        checklist: [
          'Confirm applicable rules with authorized expert',
          'Collect required evidence',
          'Review and record outcome',
        ],
      });
}

import type { Language, Profile, Source, Scenario, Segment } from './types';
import { guidance } from './demo';
export const ABSTENTION =
  'Information not found in the approved knowledge base. Please verify before advising the client.';
export interface QuestionDetectionService {
  detect(
    text: string,
    speaker: string,
  ): { meaningful: boolean; type: 'answer' | 'followup' };
}
export class SentenceQuestionDetector implements QuestionDetectionService {
  detect(text: string, speaker: string) {
    const meaningful =
      speaker === 'Client' &&
      text.trim().length >= 6 &&
      /[?？]|\b(what|which|how|can|could|eligible|help|need|difficulty|want|problem|struggling|where|when|why|kya|kaise|chahiye|loan|subsidy)\b|काय|का\?|कोण|कसे|किती|पाहिजे|हवे|अडचण|करायचा|कैसे|क्या|चाहिए|कौन|मुश्किल|मदद|कर्ज|क़र्ज़|नाही|ऋण|विस्तार/iu.test(
        text,
      );
    return {
      meaningful,
      type: /[?？]|\b(what|which|how|can|could|where|why)\b|काय|कोण|कैसे|क्या|कौन/iu.test(
        text,
      )
        ? ('answer' as const)
        : ('followup' as const),
    };
  }
}
export function detectLanguage(text: string): Language {
  if (/[\u0900-\u097F]/u.test(text))
    return /माझ|आम्ह|आहे|साठी|काय|पाहिजे|कुठ|तुमच|आणि|मध्ये|नाही|करायचा|मिळ/.test(text)
      ? 'Marathi'
      : 'Hindi';
  if (/\b(majhya|amcha|pahije|ahe|mala|milnar)\b/i.test(text)) return 'Marathi';
  if (/\b(mujhe|hamara|humara|kaise|chahiye|hai|kya|liye)\b/i.test(text))
    return 'Hindi';
  return 'English';
}
export function normalize(text: string) {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function tokens(text: string) {
  return normalize(text)
    .split(' ')
    .filter(
      (x) =>
        x.length > 2 &&
        ![
          'the',
          'what',
          'how',
          'for',
          'can',
          'our',
          'are',
          'you',
          'have',
          'with',
          'and',
          'that',
          'this',
          'which',
          'would',
          'should',
          'माझ्या',
          'आहे',
          'आहेत',
          'हमारा',
        ].includes(x),
    );
}
export function inferScenario(text: string): Scenario | undefined {
  const normalized = normalize(text);
  let best: Scenario | undefined;
  let score = 0;
  for (const [scenario, g] of Object.entries(guidance)) {
    const s = g.keywords
      .split(' ')
      .reduce((n, t) => n + (normalized.includes(t.toLowerCase()) ? 1 : 0), 0);
    if (s > score) {
      score = s;
      best = scenario as Scenario;
    }
  }
  return best;
}
export function rankText(query: string, content: string) {
  const terms = tokens(query),
    hay = normalize(content);
  const exact =
    terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0) /
    Math.max(1, terms.length);
  const scenario = inferScenario(query);
  const semantic = scenario && inferScenario(content) === scenario ? 0.45 : 0;
  return Math.min(1, exact * 0.7 + semantic);
}
export function chunkText(text: string, size = 1800, overlap = 180) {
  const clean = text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const chunks: string[] = [];
  for (let offset = 0; offset < clean.length;) {
    let end = Math.min(offset + size, clean.length);
    if (end < clean.length) {
      const cut = clean.lastIndexOf('\n', end);
      if (cut > offset + size / 2) end = cut;
    }
    chunks.push(clean.slice(offset, end));
    if (end >= clean.length) break;
    offset = Math.max(offset + 1, end - overlap);
  }
  return chunks;
}
export function extractProfile(text: string, previous: Profile): Profile {
  const p = { ...previous };
  const matches: [keyof Profile, RegExp][] = [
    [
      'turnover',
      /(?:turnover|उलाढाल)\s*(?:is|of|आहे)?\s*([₹\d.,]+\s*(?:Cr|crore|lakh|लाख|कोटी))/iu,
    ],
    ['employees', /(\d+)\s*(?:employees|कर्मचारी)/iu],
    [
      'funding',
      /([₹\d.,]+\s*(?:Lakh|Cr|crore|lakh|लाख|कोटी))\s*(?:funding|working capital|कर्ज)/iu,
    ],
    ['investment', /([₹\d.,]+\s*(?:Cr|Lakh|crore|lakh))\s*investment/iu],
  ];
  for (const [key, re] of matches) {
    const m = text.match(re);
    if (m) p[key] = m[1];
  }
  if (/\bPune\b|पुणे|पुण्यात/i.test(text)) p.location = 'Pune';
  if (/\bNashik\b|नाशिक/i.test(text)) p.location = 'Nashik';
  if (
    /(?:not|no|नाही|नहीं).{0,12}udyam|udyam.{0,12}(?:not registered|नाही|नहीं)/i.test(
      text,
    )
  )
    p.udyam = 'Not registered';
  else if (/udyam.{0,20}registered|उद्यम नोंदणी आहे/i.test(text))
    p.udyam = 'Registered';
  if (/(?:not|no).{0,6}gst|gst.{0,10}not registered/i.test(text))
    p.gst = 'Not registered';
  else if (/GST registered/i.test(text)) p.gst = 'Registered';
  if (/manufacturing|automotive components/i.test(text))
    p.industry = 'Manufacturing';
  return p;
}
export function validateAnswer(raw: unknown, sources: Source[]) {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.short_answer !== 'string' ||
    !r.short_answer.trim() ||
    r.short_answer.length > 1200 ||
    !Array.isArray(r.key_points) ||
    r.key_points.length < 1 ||
    r.key_points.length > 5 ||
    !r.key_points.every(
      (x) => typeof x === 'string' && x.length >= 8 && x.length <= 500,
    ) ||
    !Array.isArray(r.source_ids) ||
    !r.source_ids.length ||
    !r.source_ids.every((id) => sources.some((s) => s.id === id))
  )
    return null;
  const cited = sources.filter((s) =>
    (r.source_ids as unknown[]).includes(s.id),
  );
  // The production mode is deliberately extractive: a citation ID is not proof
  // of a paraphrase. Every emitted recommendation must be a complete source span.
  const clean = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();
  const supported = (s: string) =>
    cited.some((source) => clean(source.excerpt).includes(clean(s)));
  if (
    !supported(r.short_answer) ||
    !(r.key_points as string[]).every(supported)
  )
    return null;
  const checks = Array.isArray(r.what_to_check) ? r.what_to_check : [];
  if (
    checks.some((x) => typeof x !== 'string' || x.length > 300 || !supported(x))
  )
    return null;
  // Follow-ups are supplied from a curated language-specific discovery library,
  // never from unvalidated model text which could smuggle unsupported advice.
  return {
    short_answer: r.short_answer,
    key_points: r.key_points as string[],
    what_to_check: checks as string[],
    followups: [] as string[],
    sources: cited,
  };
}
export function buildNotes(
  client: string,
  company: string,
  segments: Segment[],
  answers: { short_answer: string; sources: Source[] }[],
  profile: Profile,
) {
  return `Problem\n${profile.problem || segments.find((s) => s.speaker === 'Client')?.text || 'Not established.'}\n\nDiscussion\n${client} · ${company}\n${segments
    .slice(-8)
    .map((s) => `${s.speaker}: ${s.text}`)
    .join(
      '\n',
    )}\n\nRecommendations\n${answers.length ? answers.map((a) => a.short_answer).join('\n') : 'No verified recommendations recorded.'}\n\nSchemes / Services Discussed\n${[...new Set(answers.flatMap((a) => a.sources.map((s) => s.title)))].join('\n') || 'None verified.'}\n\nDocuments Required\nTo be confirmed against the approved source and client circumstances.\n\nNext Steps\nConfirm missing client information; verify current source documents; agree follow-up actions.\n\nFollow-up Date\nTo be agreed with the client.`;
}

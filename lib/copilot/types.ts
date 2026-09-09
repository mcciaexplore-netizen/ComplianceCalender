export type Role = 'Admin' | 'Consultant' | 'Supervisor';
export type Language = 'Auto' | 'English' | 'Hindi' | 'Marathi';
export type Status =
  | 'Upcoming'
  | 'Waiting'
  | 'Live'
  | 'Completed'
  | 'Cancelled';
export type Scenario =
  | 'schemes'
  | 'loans'
  | 'gst'
  | 'expansion'
  | 'exports'
  | 'marketing';
export interface User {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: Role;
  active: number;
  demo: number;
  settings: { language: Language; autoCopilot: boolean };
}
export interface Consultant {
  id: string;
  user_id: string;
  name: string;
  specialty: string;
  languages: string;
  active: number;
}
export interface Company {
  id: string;
  name: string;
  industry: string;
  location: string;
}
export interface Client {
  id: string;
  name: string;
  company_id: string;
  email: string;
  phone: string;
}
export interface Profile {
  company?: string;
  industry?: string;
  location?: string;
  turnover?: string;
  employees?: string;
  investment?: string;
  udyam?: string;
  gst?: string;
  stage?: string;
  funding?: string;
  problem?: string;
  requirements?: string;
}
export interface Consultation {
  id: string;
  client_id: string;
  company_id: string;
  consultant_id: string;
  client: string;
  company: string;
  topic: string;
  scenario: Scenario;
  start: string;
  end: string;
  status: Status;
  language: Language;
  started_at?: string;
  ended_at?: string;
  duration?: number;
  demo: number;
  profile: Profile;
  summary?: string;
  notes?: string;
  consent?: boolean;
}
export interface Segment {
  id: string;
  consultation_id: string;
  speaker: 'Client' | 'Consultant';
  text: string;
  timestamp: string;
  language: string;
  confidence: number;
  sequence: number;
  external_id: string;
}
export interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  department: string;
  scheme: string;
  state: string;
  industry: string;
  effective_date: string;
  source: string;
  version: string;
  updated: string;
  status: 'Approved' | 'Draft' | 'Processing' | 'Failed';
  content: string;
  filename: string;
  type: string;
  demo: number;
  error?: string;
}
export interface Source {
  id: string;
  document_id: string;
  title: string;
  section: string;
  updated: string;
  excerpt: string;
  source: string;
  score: number;
}
export interface Suggestion {
  id: string;
  consultation_id: string;
  question: string;
  short_answer: string;
  key_points: string[];
  what_to_check: string[];
  sources: Source[];
  confidence: 'High' | 'Medium' | 'Low' | 'Unverified';
  followups: string[];
  type: 'answer' | 'followup';
  timestamp: string;
  latency_ms: number;
  cached?: boolean;
  feedback?: string;
  language: Language;
}
export interface Alert {
  id: string;
  type:
    | 'Missing information'
    | 'Verification required'
    | 'Opportunity'
    | 'Follow-up required';
  text: string;
}
export interface ConsultationDetail extends Consultation {
  transcript: Segment[];
  suggestions: Suggestion[];
  alerts: Alert[];
  followups: { id: string; text: string; status: string; due: string }[];
  events?: EventRecord[];
}
export interface EventRecord {
  id: number;
  type: string;
  data: unknown;
  timestamp: string;
}
export interface Workspace {
  language_usage: { language: string; count: number }[];
  searches: { topic: string; count: number }[];
  user: User;
  consultants: Consultant[];
  companies: Company[];
  clients: Client[];
  consultations: Consultation[];
  knowledge: KnowledgeDocument[];
  categories: string[];
  metrics: {
    suggestions: number;
    accepted: number;
    rejected: number;
    verification: number;
    incorrect: number;
    latency: number;
    retrieval_rate: number;
    feedback: number;
  };
  gaps: { question: string; feedback: string; count: number }[];
  activity: { actor: string; action: string; timestamp: string }[];
  providers: {
    ai: boolean;
    stt: boolean;
    stt_provider: string;
    embedding: boolean;
    database: string;
  };
}
export const scenarios: {
  id: Scenario;
  title: string;
  description: string;
  language: string;
}[] = [
  {
    id: 'schemes',
    title: 'Government scheme enquiry',
    description:
      'Help a Pune manufacturer explore support for a new production line.',
    language: 'Marathi + English',
  },
  {
    id: 'loans',
    title: 'Bank loan assistance',
    description: 'Understand a growing food business’s financing needs.',
    language: 'Hindi + English',
  },
  {
    id: 'gst',
    title: 'GST & compliance',
    description:
      'Identify missing records and prepare a verification checklist.',
    language: 'English',
  },
  {
    id: 'expansion',
    title: 'Business expansion',
    description: 'Build a practical discovery brief for a factory expansion.',
    language: 'Marathi + English',
  },
  {
    id: 'exports',
    title: 'Export assistance',
    description: 'Guide a first-time exporter through the right questions.',
    language: 'English',
  },
  {
    id: 'marketing',
    title: 'Digital marketing',
    description: 'Explore a small retailer’s customer acquisition challenges.',
    language: 'Hindi + English',
  },
];

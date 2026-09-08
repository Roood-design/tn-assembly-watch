// Shape mirrors the plan's data model in /Users/anirudh/.claude/plans/i-want-to-build-robust-forest.md.
// Keeping it here means the frontend can be built against mock data now,
// and the ingestion pipeline (Phase 2) targets the same schema.

export type PartyCode =
  | 'DMK' | 'AIADMK' | 'BJP' | 'INC' | 'VCK' | 'PMK'
  | 'CPI' | 'CPIM' | 'NTK' | 'IND';

export type Alliance = 'ruling' | 'opposition' | 'independent';

export type SegmentType =
  | 'question_hour'
  | 'zero_hour'
  | 'bill'
  | 'papers_laid'
  | 'obituary'
  | 'adjournment'
  | 'address'      // Governor's / Chief Minister's address
  | 'other';

export type ContentClass =
  | 'substantive'   // policy, facts, questions of governance
  | 'procedural'    // motions, points of order, house business
  | 'praise'        // eulogising a leader or party
  | 'attack'        // personal / ad-hominem attack on another member
  | 'uproar'        // disruption, sloganeering, overlapping speech
  | 'reading';      // reading a prepared statement or gazette

export interface Speaker {
  name: string;
  mla_id: string | null;   // null = unidentified speaker
  party: PartyCode | null;
  role?: string;
}

export interface Segment {
  id: string;
  start_seconds: number;
  end_seconds: number;
  type: SegmentType;
  speaker: Speaker;
  content_class: ContentClass;
  topics: string[];
  transcript: string;
  confidence?: { asr?: number; speaker_id?: number; classification?: number };
}

export interface NotableEvent {
  type: 'walkout' | 'adjournment' | 'expunged' | 'oath' | 'marathon_speech';
  at_seconds: number;
  duration_seconds?: number;
  party?: PartyCode;
  detail?: string;
}

export interface MoodPoint { t: number; score: number; }

export interface Sitting {
  sitting_id: string;
  date: string;                 // ISO YYYY-MM-DD
  assembly: number;
  session: number;
  sitting_number: number;
  video: {
    youtube_id: string;
    start_offset_seconds: number;
    duration_seconds: number;
  };
  official: {
    list_of_business: string[];
    bills: { title: string; stage: string }[];
    questions_count: { starred: number; unstarred: number };
  };
  segments: Segment[];
  events: NotableEvent[];
  aggregates: {
    speaking_time_by_party: Record<PartyCode, number>;
    speaking_time_by_speaker: { mla_id: string; name: string; party: PartyCode; seconds: number }[];
    content_class_split: Record<ContentClass, number>;
    mood_series: MoodPoint[];
    total_active_seconds: number;
  };
}

export interface Mla {
  mla_id: string;
  name: string;
  party: PartyCode;
  alliance: Alliance;
  constituency: string;
  roles?: string[];
}

// UI-only helpers
export const PARTY_COLORS: Record<PartyCode, string> = {
  DMK:    '#d92828',
  AIADMK: '#00a651',
  BJP:    '#f97316',
  INC:    '#009cde',
  VCK:    '#1e40af',
  PMK:    '#facc15',
  CPI:    '#dc2626',
  CPIM:   '#b91c1c',
  NTK:    '#111827',
  IND:    '#6b7280',
};

export const SEGMENT_TYPE_LABELS: Record<SegmentType, string> = {
  question_hour: 'Question Hour',
  zero_hour:     'Zero Hour',
  bill:          'Bill',
  papers_laid:   'Papers Laid',
  obituary:      'Obituary',
  adjournment:   'Adjournment',
  address:       'Address',
  other:         'Other',
};

export const SEGMENT_TYPE_COLORS: Record<SegmentType, string> = {
  question_hour: '#3b82f6',
  zero_hour:     '#8b5cf6',
  bill:          '#059669',
  papers_laid:   '#64748b',
  obituary:      '#334155',
  adjournment:   '#ef4444',
  address:       '#eab308',
  other:         '#94a3b8',
};

export const CONTENT_CLASS_LABELS: Record<ContentClass, string> = {
  substantive: 'Substantive',
  procedural:  'Procedural',
  praise:      'Praise',
  attack:      'Attack',
  uproar:      'Uproar / Disruption',
  reading:     'Reading Statement',
};

export const CONTENT_CLASS_COLORS: Record<ContentClass, string> = {
  substantive: '#059669',
  procedural:  '#64748b',
  praise:      '#ec4899',
  attack:      '#f97316',
  uproar:      '#ef4444',
  reading:     '#a3a3a3',
};

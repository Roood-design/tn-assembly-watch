// Shape mirrors the plan's data model in /Users/anirudh/.claude/plans/i-want-to-build-robust-forest.md.
// Keeping it here means the frontend can be built against curated/mock data now,
// and the ingestion pipeline (Phase 2) targets the same schema.

export type PartyCode =
  | 'TVK' | 'DMK' | 'AIADMK' | 'BJP' | 'INC' | 'VCK' | 'PMK'
  | 'CPI' | 'CPIM' | 'NTK' | 'IND';

export type Alliance = 'ruling' | 'opposition' | 'independent';

export type SegmentType =
  | 'question_hour'
  | 'zero_hour'
  | 'bill'
  | 'papers_laid'
  | 'obituary'
  | 'adjournment'
  | 'demand_for_grants'   // debate on ministry-level budget demands
  | 'address'             // Governor's / Chief Minister's address
  | 'walkout'             // opposition walkout as a distinct segment
  | 'other';

export type ContentClass =
  | 'substantive'   // policy, facts, questions of governance
  | 'procedural'    // motions, points of order, house business
  | 'praise'        // eulogising a leader or party
  | 'attack'        // personal / ad-hominem attack on another member
  | 'uproar'        // disruption, sloganeering, overlapping speech
  | 'reading';      // reading a prepared statement or gazette

export type SourceMode = 'asr' | 'curated_public_reporting';

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
  source_ref?: string;     // when source_mode = curated_public_reporting: URL of the news report
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
  source_mode: SourceMode;      // how the segments were derived
  source_notes?: string;        // human-readable note shown on the UI as attribution
  video: {
    youtube_id: string;
    start_offset_seconds: number;
    duration_seconds: number;
    video_source_note?: string; // e.g. "unofficial news-channel LIVE"
  };
  official: {
    list_of_business: string[];
    bills: { title: string; stage: string }[];
    questions_count: { starred: number; unstarred: number };
  };
  segments: Segment[];
  events: NotableEvent[];
  aggregates: {
    speaking_time_by_party: Partial<Record<PartyCode, number>>;
    speaking_time_by_speaker: { mla_id: string; name: string; party: PartyCode; seconds: number }[];
    content_class_split: Partial<Record<ContentClass, number>>;
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
  TVK:    '#e11d48',   // TVK — bright red (party's own palette)
  DMK:    '#000000',   // black — traditional DMK flag
  INC:    '#009cde',   // sky blue — Congress
  AIADMK: '#00a651',   // green (AIADMK's two-leaves)
  BJP:    '#f97316',   // saffron
  VCK:    '#1e40af',   // deep blue
  PMK:    '#facc15',   // yellow
  CPI:    '#dc2626',   // red
  CPIM:   '#b91c1c',   // dark red
  NTK:    '#111827',   // near-black
  IND:    '#6b7280',   // gray
};

export const SEGMENT_TYPE_LABELS: Record<SegmentType, string> = {
  question_hour:      'Question Hour',
  zero_hour:          'Zero Hour',
  bill:               'Bill',
  papers_laid:        'Papers Laid',
  obituary:           'Obituary',
  adjournment:        'Adjournment',
  demand_for_grants:  'Demand for Grants',
  address:            'Address',
  walkout:            'Walkout',
  other:              'Other',
};

export const SEGMENT_TYPE_COLORS: Record<SegmentType, string> = {
  question_hour:      '#3b82f6',
  zero_hour:          '#8b5cf6',
  bill:               '#059669',
  papers_laid:        '#64748b',
  obituary:           '#334155',
  adjournment:        '#ef4444',
  demand_for_grants:  '#0891b2',
  address:            '#eab308',
  walkout:            '#dc2626',
  other:              '#94a3b8',
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

import { useEffect, useMemo, useRef } from 'react';
import { useStore } from '@nanostores/react';
import {
  type Segment,
  SEGMENT_TYPE_LABELS,
  SEGMENT_TYPE_COLORS,
  CONTENT_CLASS_LABELS,
  CONTENT_CLASS_COLORS,
  PARTY_COLORS,
} from '../types';
import { currentTime, requestSeek } from '../stores/playback';

interface Props {
  segments: Segment[];
}

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * Given a sorted, non-overlapping list of segments and the current playback time
 * (in seconds), return the id of the segment that should be treated as "active"
 * for highlighting and auto-scrolling. Return null if no segment applies.
 *
 * Design considerations you can weigh:
 *  - What if `nowSeconds` falls in a gap between two segments? (return the
 *    previous, the next, or null?)
 *  - What if `nowSeconds` is before the first segment or after the last?
 *  - Should there be a small tolerance so that momentary crossings of a segment
 *    boundary don't cause the highlight to flicker between segments?
 *  - Efficiency: segments can be thousands long — linear scan vs binary search?
 *
 * Segments are guaranteed sorted by start_seconds and non-overlapping.
 */
function pickActiveSegment(segments: Segment[], nowSeconds: number): string | null {
  const TOLERANCE = 1;
  if (segments.length === 0) return null;
  if (nowSeconds < segments[0].start_seconds) return null;
  const last = segments[segments.length - 1];
  if (nowSeconds >= last.end_seconds + TOLERANCE) return null;
  let lo = 0, hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (segments[mid].start_seconds <= nowSeconds) lo = mid;
    else hi = mid - 1;
  }
  return segments[lo].id;
}

export default function TranscriptViewer({ segments }: Props) {
  const now = useStore(currentTime);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const activeId = useMemo(() => pickActiveSegment(segments, now), [segments, now]);

  // When the active segment changes, gently scroll it into view.
  useEffect(() => {
    if (!activeRef.current || !containerRef.current) return;
    const el = activeRef.current;
    const parent = containerRef.current;
    const parentRect = parent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const outOfView = elRect.top < parentRect.top || elRect.bottom > parentRect.bottom;
    if (outOfView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeId]);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col h-[560px]">
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Transcript</h3>
        <span className="text-xs text-slate-500">click a line to jump the video</span>
      </div>

      <div
        ref={containerRef}
        className="transcript-scroll flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {segments.map(seg => {
          const isActive = seg.id === activeId;
          return (
            <div
              key={seg.id}
              ref={isActive ? activeRef : undefined}
              onClick={() => requestSeek(seg.start_seconds)}
              className={`group cursor-pointer rounded p-3 border transition-colors ${
                isActive
                  ? 'border-sky-400 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/40'
                  : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="tabular-nums text-slate-500 group-hover:text-sky-600">
                  {fmtTime(seg.start_seconds)}
                </span>
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-white text-[10px] uppercase tracking-wide"
                  style={{ background: SEGMENT_TYPE_COLORS[seg.type] }}
                >
                  {SEGMENT_TYPE_LABELS[seg.type]}
                </span>
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-white text-[10px] uppercase tracking-wide"
                  style={{ background: CONTENT_CLASS_COLORS[seg.content_class] }}
                >
                  {CONTENT_CLASS_LABELS[seg.content_class]}
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  {seg.speaker.party && (
                    <span
                      className="inline-block w-2 h-2 rounded-sm"
                      style={{ background: PARTY_COLORS[seg.speaker.party] }}
                    />
                  )}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {seg.speaker.name}
                  </span>
                  {seg.speaker.role && (
                    <span className="text-slate-500">· {seg.speaker.role}</span>
                  )}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {seg.transcript}
              </p>
              {seg.topics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {seg.topics.map(t => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

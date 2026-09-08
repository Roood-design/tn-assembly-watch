import { useMemo, useRef, useState, useEffect } from 'react';
import { scaleLinear } from 'd3-scale';
import { useStore } from '@nanostores/react';
import {
  type Segment,
  type SegmentType,
  type ContentClass,
  type PartyCode,
  SEGMENT_TYPE_COLORS,
  SEGMENT_TYPE_LABELS,
  CONTENT_CLASS_COLORS,
  CONTENT_CLASS_LABELS,
  PARTY_COLORS,
} from '../types';
import { currentTime, requestSeek } from '../stores/playback';

type ColorMode = 'business' | 'party' | 'content_class';

interface Props {
  segments: Segment[];
  totalSeconds: number;
}

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

function colorFor(seg: Segment, mode: ColorMode): string {
  if (mode === 'business') return SEGMENT_TYPE_COLORS[seg.type];
  if (mode === 'content_class') return CONTENT_CLASS_COLORS[seg.content_class];
  if (seg.speaker.party) return PARTY_COLORS[seg.speaker.party];
  return '#cbd5e1';
}

export default function TimelineRibbon({ segments, totalSeconds }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  const [mode, setMode] = useState<ColorMode>('business');
  const [hover, setHover] = useState<{ seg: Segment; x: number } | null>(null);
  const now = useStore(currentTime);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setWidth(Math.max(320, e.contentRect.width));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const HEIGHT = 68;
  const PADDING = 8;
  const barTop = 18;
  const barHeight = HEIGHT - barTop - PADDING;

  const x = useMemo(
    () => scaleLinear().domain([0, totalSeconds]).range([0, width]),
    [totalSeconds, width],
  );

  // Hour tick marks
  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let t = 0; t <= totalSeconds; t += 3600) arr.push(t);
    return arr;
  }, [totalSeconds]);

  function onSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const t = Math.round(x.invert(px));
    requestSeek(t);
  }

  function legendItems(): { label: string; color: string }[] {
    if (mode === 'business') {
      return Object.entries(SEGMENT_TYPE_LABELS).map(([k, label]) => ({
        label,
        color: SEGMENT_TYPE_COLORS[k as SegmentType],
      }));
    }
    if (mode === 'content_class') {
      return Object.entries(CONTENT_CLASS_LABELS).map(([k, label]) => ({
        label,
        color: CONTENT_CLASS_COLORS[k as ContentClass],
      }));
    }
    const parties: PartyCode[] = ['DMK', 'AIADMK', 'BJP', 'VCK', 'PMK', 'INC'];
    return parties.map(p => ({ label: p, color: PARTY_COLORS[p] }));
  }

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 mr-2">Colour by:</span>
          {(['business', 'content_class', 'party'] as ColorMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-0.5 rounded border ${
                mode === m
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {m === 'business' ? 'business type' : m === 'content_class' ? 'content' : 'party'}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500">
          {fmtTime(now)} / {fmtTime(totalSeconds)}
        </div>
      </div>

      <div className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Session timeline"
          onClick={onSvgClick}
          onMouseLeave={() => setHover(null)}
          className="cursor-pointer select-none block"
        >
          {/* Hour tick lines + labels */}
          {ticks.map(t => (
            <g key={t}>
              <line
                x1={x(t)} x2={x(t)} y1={0} y2={HEIGHT}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeWidth={1}
              />
              <text
                x={x(t) + 3} y={12}
                fontSize={10}
                className="fill-slate-500"
              >
                {fmtTime(t)}
              </text>
            </g>
          ))}

          {/* Segments */}
          {segments.map(seg => {
            const sx = x(seg.start_seconds);
            const ex = x(seg.end_seconds);
            const w = Math.max(1, ex - sx);
            return (
              <rect
                key={seg.id}
                x={sx}
                y={barTop}
                width={w}
                height={barHeight}
                fill={colorFor(seg, mode)}
                onMouseMove={e => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement)
                    .getBoundingClientRect();
                  setHover({ seg, x: e.clientX - rect.left });
                }}
              >
                <title>
                  {SEGMENT_TYPE_LABELS[seg.type]} — {seg.speaker.name}
                  {seg.speaker.party ? ` (${seg.speaker.party})` : ''} · {fmtTime(seg.end_seconds - seg.start_seconds)}
                </title>
              </rect>
            );
          })}

          {/* Playback cursor */}
          <g>
            <line
              x1={x(now)} x2={x(now)}
              y1={barTop - 6} y2={barTop + barHeight + 4}
              stroke="#0ea5e9" strokeWidth={2}
            />
            <polygon
              points={`${x(now) - 4},${barTop - 8} ${x(now) + 4},${barTop - 8} ${x(now)},${barTop - 2}`}
              fill="#0ea5e9"
            />
          </g>
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full mt-1 rounded bg-slate-900 text-white text-xs px-2 py-1 shadow-lg dark:bg-slate-100 dark:text-slate-900"
            style={{ left: hover.x, top: barTop }}
          >
            <div className="font-medium">{SEGMENT_TYPE_LABELS[hover.seg.type]}</div>
            <div>
              {hover.seg.speaker.name}
              {hover.seg.speaker.party ? ` · ${hover.seg.speaker.party}` : ''}
            </div>
            <div className="opacity-70">
              {fmtTime(hover.seg.start_seconds)} – {fmtTime(hover.seg.end_seconds)} ·{' '}
              {CONTENT_CLASS_LABELS[hover.seg.content_class]}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
        {legendItems().map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: item.color }}
            />
            <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

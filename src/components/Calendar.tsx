import { useMemo, useState } from 'react';
import type { Sitting } from '../types';

interface Props {
  sittings: Sitting[];
  todayIso?: string;                // YYYY-MM-DD — override for SSR determinism
  initialMonth?: string;            // YYYY-MM
}

interface Cell {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  sitting?: Sitting;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseYm(ym: string): Date {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1);
}
function shiftMonth(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildCells(month: Date, sittings: Sitting[], todayIso: string): Cell[] {
  const byDate = new Map(sittings.map(s => [s.date, s] as const));
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  // Monday-first calendar: 0..6 with Monday=0
  const weekday = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - weekday);

  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const iso = toIso(d);
    cells.push({
      date: d,
      iso,
      inMonth: d.getMonth() === month.getMonth(),
      isToday: iso === todayIso,
      sitting: byDate.get(iso),
    });
  }
  return cells;
}

function hoursMinutes(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function dominantParty(s: Sitting): { code: string; color: string } | null {
  const entries = Object.entries(s.aggregates.speaking_time_by_party) as [string, number][];
  if (entries.length === 0) return null;
  entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const [code] = entries[0];
  const palette: Record<string, string> = {
    TVK: '#e11d48', DMK: '#111827', INC: '#009cde', AIADMK: '#00a651',
    BJP: '#f97316', VCK: '#1e40af', PMK: '#facc15',
  };
  return { code, color: palette[code] ?? '#64748b' };
}

export default function Calendar({ sittings, todayIso, initialMonth }: Props) {
  const startMonth = initialMonth ? parseYm(initialMonth) : new Date();
  const today = todayIso ?? toIso(new Date());
  const [month, setMonth] = useState<Date>(startMonth);

  const cells = useMemo(() => buildCells(month, sittings, today), [month, sittings, today]);

  const monthSittings = cells.filter(c => c.inMonth && c.sitting).map(c => c.sitting!);
  const totalHours = monthSittings.reduce((a, s) => a + s.aggregates.total_active_seconds, 0) / 3600;

  return (
    <div className="calendar">
      <div className="cal-head">
        <div>
          <div className="cal-eyebrow">Calendar</div>
          <h1 className="cal-title">{MONTHS[month.getMonth()]} {month.getFullYear()}</h1>
        </div>
        <div className="cal-nav">
          <button className="cal-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            ‹
          </button>
          <button className="cal-btn cal-today" onClick={() => setMonth(new Date())}>Today</button>
          <button className="cal-btn" onClick={() => setMonth(shiftMonth(month, +1))} aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      <div className="cal-summary">
        <span><strong>{monthSittings.length}</strong> sitting{monthSittings.length === 1 ? '' : 's'} this month</span>
        <span className="cal-summary-dot">·</span>
        <span><strong>{totalHours.toFixed(1)}</strong> hours on the record</span>
      </div>

      <div className="cal-grid">
        {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map(c => {
          const party = c.sitting ? dominantParty(c.sitting) : null;
          const isSunday = ((c.date.getDay() + 6) % 7) === 6;
          return (
            <a
              key={c.iso}
              href={c.sitting ? `/sitting/${c.sitting.sitting_id}` : undefined}
              className={[
                'cal-cell',
                c.inMonth ? '' : 'cal-cell-out',
                c.isToday ? 'cal-cell-today' : '',
                c.sitting ? 'cal-cell-active' : 'cal-cell-empty',
                isSunday ? 'cal-cell-sun' : '',
              ].filter(Boolean).join(' ')}
              style={party ? { ['--party-color' as any]: party.color } : undefined}
              onClick={e => { if (!c.sitting) e.preventDefault(); }}
            >
              <div className="cal-cell-head">
                <span className="cal-cell-day">{c.date.getDate()}</span>
                {c.isToday && <span className="cal-cell-today-pill">Today</span>}
              </div>
              {c.sitting && (
                <div className="cal-cell-body">
                  <div className="cal-cell-band" />
                  <div className="cal-cell-meta">
                    <span className="cal-cell-hours">{hoursMinutes(c.sitting.aggregates.total_active_seconds)}</span>
                    <span className="cal-cell-segs">{c.sitting.segments.length} seg</span>
                  </div>
                </div>
              )}
            </a>
          );
        })}
      </div>

      <style>{`
        .calendar { display: flex; flex-direction: column; gap: 16px; }
        .cal-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .cal-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: rgb(100 116 139); }
        .cal-title { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; margin: 4px 0 0; }
        .cal-nav { display: flex; gap: 6px; }
        .cal-btn {
          border: 1px solid rgb(226 232 240); background: white;
          padding: 6px 12px; border-radius: 8px; font-size: 14px;
          cursor: pointer; color: rgb(51 65 85);
          transition: background 120ms ease, border-color 120ms ease;
        }
        .cal-btn:hover { background: rgb(248 250 252); border-color: rgb(203 213 225); }
        .cal-today { font-weight: 500; }
        :root[data-theme="dark"] .cal-btn,
        :root:not([data-theme="light"]) .cal-btn {
          background: rgb(15 23 42); border-color: rgb(30 41 59); color: rgb(226 232 240);
        }
        :root[data-theme="dark"] .cal-btn:hover,
        :root:not([data-theme="light"]) .cal-btn:hover {
          background: rgb(30 41 59);
        }

        .cal-summary { font-size: 13px; color: rgb(71 85 105); }
        .cal-summary strong { color: rgb(15 23 42); font-weight: 600; }
        .cal-summary-dot { margin: 0 8px; color: rgb(203 213 225); }
        :root[data-theme="dark"] .cal-summary,
        :root:not([data-theme="light"]) .cal-summary { color: rgb(148 163 184); }
        :root[data-theme="dark"] .cal-summary strong,
        :root:not([data-theme="light"]) .cal-summary strong { color: rgb(241 245 249); }

        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          background: rgb(241 245 249);
          border-radius: 12px;
          padding: 12px;
        }
        :root[data-theme="dark"] .cal-grid,
        :root:not([data-theme="light"]) .cal-grid {
          background: rgb(11 16 25);
        }
        .cal-dow {
          font-size: 11px; font-weight: 600;
          color: rgb(100 116 139); text-transform: uppercase; letter-spacing: 0.08em;
          padding: 4px 8px;
        }

        .cal-cell {
          position: relative;
          min-height: 92px;
          background: white;
          border: 1px solid rgb(226 232 240);
          border-radius: 8px;
          padding: 8px 10px;
          display: flex; flex-direction: column;
          text-decoration: none; color: inherit;
          transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
        }
        :root[data-theme="dark"] .cal-cell,
        :root:not([data-theme="light"]) .cal-cell {
          background: rgb(15 23 42);
          border-color: rgb(30 41 59);
        }
        .cal-cell-out { opacity: 0.4; background: rgb(248 250 252); }
        :root[data-theme="dark"] .cal-cell-out,
        :root:not([data-theme="light"]) .cal-cell-out {
          background: rgb(8 12 20); opacity: 0.55;
        }
        .cal-cell-active { cursor: pointer; }
        .cal-cell-active:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px -8px rgba(15,23,42,0.18);
          border-color: rgb(148 163 184);
        }
        :root[data-theme="dark"] .cal-cell-active:hover,
        :root:not([data-theme="light"]) .cal-cell-active:hover {
          border-color: rgb(71 85 105);
          box-shadow: 0 8px 20px -8px rgba(0,0,0,0.5);
        }
        .cal-cell-empty { cursor: default; }
        .cal-cell-today { outline: 2px solid #e11d48; outline-offset: 1px; }
        .cal-cell-sun .cal-cell-day { color: rgb(148 163 184); }

        .cal-cell-head {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 13px; font-weight: 500;
          color: rgb(71 85 105);
        }
        :root[data-theme="dark"] .cal-cell-head,
        :root:not([data-theme="light"]) .cal-cell-head { color: rgb(148 163 184); }
        .cal-cell-day { font-weight: 600; }
        .cal-cell-today-pill {
          font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em;
          background: #e11d48; color: white; padding: 1px 5px; border-radius: 3px;
        }

        .cal-cell-body { display: flex; flex-direction: column; gap: 6px; margin-top: auto; }
        .cal-cell-band {
          height: 3px; border-radius: 2px;
          background: var(--party-color, #64748b);
        }
        .cal-cell-meta {
          display: flex; justify-content: space-between; align-items: baseline;
          font-size: 11px; color: rgb(51 65 85);
        }
        :root[data-theme="dark"] .cal-cell-meta,
        :root:not([data-theme="light"]) .cal-cell-meta { color: rgb(203 213 225); }
        .cal-cell-hours { font-weight: 600; font-size: 13px; }
        .cal-cell-segs { opacity: 0.6; }

        @media (max-width: 900px) {
          .cal-cell { min-height: 68px; padding: 6px 7px; }
          .cal-cell-hours { font-size: 11px; }
          .cal-cell-segs { display: none; }
          .cal-dow { padding: 2px 4px; font-size: 9px; }
        }
      `}</style>
    </div>
  );
}

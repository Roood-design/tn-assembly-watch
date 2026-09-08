import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Sitting, Mla, PartyCode } from '../types';
import { PARTY_COLORS } from '../types';
import { requestSeek } from '../stores/playback';

interface Props {
  sitting: Sitting;
  mlas: Mla[];
}

function fmtMin(secs: number): string {
  const m = Math.round(secs / 60);
  return `${m} min`;
}

export default function SpeakingTimeDonut({ sitting, mlas }: Props) {
  const byMla = Object.fromEntries(mlas.map(m => [m.mla_id, m]));

  // Ruling vs Opposition (derived from MLA alliance)
  let ruling = 0, opposition = 0, other = 0;
  for (const s of sitting.aggregates.speaking_time_by_speaker) {
    const m = byMla[s.mla_id];
    if (m?.alliance === 'ruling') ruling += s.seconds;
    else if (m?.alliance === 'opposition') opposition += s.seconds;
    else other += s.seconds;
  }

  const allianceData = [
    { name: 'Ruling', value: ruling, fill: '#0ea5e9' },
    { name: 'Opposition', value: opposition, fill: '#f43f5e' },
    ...(other > 0 ? [{ name: 'Other', value: other, fill: '#94a3b8' }] : []),
  ];

  const partyData = (Object.entries(sitting.aggregates.speaking_time_by_party) as [PartyCode, number][])
    .filter(([, v]) => v > 0)
    .map(([party, seconds]) => ({ party, seconds, fill: PARTY_COLORS[party] }))
    .sort((a, b) => b.seconds - a.seconds);

  const leaderboard = [...sitting.aggregates.speaking_time_by_speaker]
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 10);

  // Find the first segment for each speaker so clicking a bar seeks the video there.
  const firstSegmentByMla = new Map<string, number>();
  for (const seg of sitting.segments) {
    if (seg.speaker.mla_id && !firstSegmentByMla.has(seg.speaker.mla_id)) {
      firstSegmentByMla.set(seg.speaker.mla_id, seg.start_seconds);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <h3 className="text-sm font-semibold mb-2">Ruling vs Opposition</h3>
        <div className="h-52">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={allianceData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                {allianceData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtMin(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <h3 className="text-sm font-semibold mb-2">By Party</h3>
        <div className="h-52">
          <ResponsiveContainer>
            <BarChart data={partyData} layout="vertical" margin={{ left: 10, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="party" width={70} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmtMin(v)} />
              <Bar dataKey="seconds">
                {partyData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <h3 className="text-sm font-semibold mb-2">Top speakers <span className="text-xs text-slate-500">(click to jump)</span></h3>
        <ul className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
          {leaderboard.map(s => {
            const first = firstSegmentByMla.get(s.mla_id);
            const canSeek = first !== undefined;
            const max = leaderboard[0]?.seconds ?? 1;
            const pct = Math.round((s.seconds / max) * 100);
            return (
              <li key={s.mla_id} className="py-1.5">
                <button
                  disabled={!canSeek}
                  onClick={() => canSeek && requestSeek(first!)}
                  className="w-full text-left flex items-center gap-2 group disabled:cursor-not-allowed"
                >
                  <span
                    className="inline-block w-1.5 h-4 rounded-sm shrink-0"
                    style={{ background: PARTY_COLORS[s.party] }}
                  />
                  <span className="grow min-w-0">
                    <span className="block truncate text-slate-900 dark:text-slate-100 group-hover:underline">{s.name}</span>
                    <span className="block text-xs text-slate-500">{s.party}</span>
                  </span>
                  <span className="tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                    {fmtMin(s.seconds)}
                  </span>
                </button>
                <div className="h-1 mt-1 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, background: PARTY_COLORS[s.party] }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

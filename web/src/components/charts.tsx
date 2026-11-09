// Small dependency-free SVG charts for the admin dashboard.
// Rules followed: one y-axis, thin marks, legend for 2+ series, hover tooltips, a table view for every chart,
// and categorical colours assigned in a fixed order (validated palette below).
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Validated categorical order (light surface). Never cycle past 4 here; fold extra series into "อื่นๆ". */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const GRID = '#E6EDF7';
const AXIS_TEXT = '#52637A';

export const fmtInt = (n: number) => n.toLocaleString('th-TH');
export const fmtPct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;

function useWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Rounds an axis maximum up to a friendly number. */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export interface TableData { head: string[]; rows: (string | number)[][] }

/** Card wrapper: title, optional legend/actions, the chart, and a toggle to a plain table (accessibility + exact values). */
export function ChartCard({ title, subtitle, table, actions, children, minHeight }: {
  title: string; subtitle?: ReactNode; table?: TableData; actions?: ReactNode; children: ReactNode; minHeight?: number;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="a-card" style={{ minHeight }}>
      <div className="a-card-head">
        <div style={{ marginRight: 'auto' }}>
          <h2>{title}</h2>
          {subtitle && <div className="a-sub">{subtitle}</div>}
        </div>
        {actions}
        {table && (
          <button type="button" className="a-link-btn no-print" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
            {asTable ? 'ดูเป็นกราฟ' : 'ดูเป็นตาราง'}
          </button>
        )}
      </div>
      {asTable && table ? <DataTable data={table} /> : children}
    </section>
  );
}

export function DataTable({ data }: { data: TableData }) {
  return (
    <div className="a-table-wrap">
      <table className="a-table">
        <thead><tr>{data.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{data.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{typeof c === 'number' ? fmtInt(c) : c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="a-legend">
      {items.map((i) => (
        <li key={i.name}>
          <span style={{ background: i.dashed ? 'transparent' : i.color, borderTop: i.dashed ? `2px dashed ${i.color}` : undefined, height: i.dashed ? 0 : 10 }} />
          {i.name}
        </li>
      ))}
    </ul>
  );
}

export const EmptyChart = ({ text = 'ยังไม่มีข้อมูลในช่วงเวลานี้' }: { text?: string }) => (
  <div className="a-empty">{text}</div>
);

// ---------------------------------------------------------------------------

export interface LineSeries { name: string; color: string; values: (number | null)[]; dashed?: boolean }

export function LineChart({ labels, series, height = 230, format = fmtInt, yMax, ariaLabel, emptyText }: {
  labels: string[]; series: LineSeries[]; height?: number; format?: (n: number) => string; yMax?: number; ariaLabel: string; emptyText?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (!labels.length || !all.length) return <div ref={ref}><EmptyChart text={emptyText} /></div>;
  const max = yMax ?? niceMax(Math.max(...all, 1));
  const L = 44, R = 12, T = 12, B = 28;
  const w = width, h = height;
  const x = (i: number) => (labels.length === 1 ? (L + w - R) / 2 : L + (i * (w - L - R)) / (labels.length - 1));
  const y = (v: number) => T + (1 - v / max) * (h - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const every = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor((w - L) / 70))));

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    const i = Math.round(((px - L) / (w - L - R)) * (labels.length - 1));
    setHover(Math.min(labels.length - 1, Math.max(0, i)));
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {series.length > 1 && <Legend items={series} />}
      <svg width={w} height={h} role="img" aria-label={ariaLabel} onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ display: 'block', touchAction: 'pan-y' }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={w - R} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={AXIS_TEXT}>{format(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % every === 0 || i === labels.length - 1) && (
          <text key={i} x={x(i)} y={h - 8} textAnchor={labels.length > 1 && i === 0 ? 'start' : labels.length > 1 && i === labels.length - 1 ? 'end' : 'middle'} fontSize="11" fill={AXIS_TEXT}>{l}</text>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={h - B} stroke="#9AACC6" strokeDasharray="3 3" />}
        {series.map((s) => {
          // Break the line at nulls (suppressed or missing periods).
          const parts: string[] = [];
          let cur = '';
          s.values.forEach((v, i) => {
            if (v === null) { if (cur) parts.push(cur); cur = ''; return; }
            cur += `${cur ? 'L' : 'M'}${x(i)} ${y(v)}`;
          });
          if (cur) parts.push(cur);
          return (
            <g key={s.name}>
              {parts.map((d, k) => <path key={k} d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '6 5' : undefined} />)}
              {labels.length <= 31 && s.values.map((v, i) => v !== null && (
                <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 3} fill="#fff" stroke={s.color} strokeWidth="2" />
              ))}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="a-tip" style={{ left: Math.min(Math.max(x(hover), 80), w - 80), top: 8 }}>
          <b>{labels[hover]}</b>
          {series.map((s) => (
            <div key={s.name}><span style={{ background: s.color }} />{s.name}: {s.values[hover] === null ? '—' : format(s.values[hover]!)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Horizontal bars; with `back` set, a lighter "total" bar sits behind the main value (e.g. started vs completed). */
export function HBarList({ rows, max, mainName, backName }: {
  rows: { label: string; value: number; back?: number; color?: string; note?: string }[];
  max?: number; mainName: string; backName?: string;
}) {
  const m = niceMax(max ?? Math.max(1, ...rows.map((r) => Math.max(r.value, r.back ?? 0))));
  if (!rows.some((r) => r.value || r.back)) return <EmptyChart />;
  return (
    <div>
      {backName && <Legend items={[{ name: backName, color: '#A9C6EC' }, { name: mainName, color: SERIES[0] }]} />}
      <ul className="a-hbars">
        {rows.map((r) => (
          <li key={r.label} title={`${r.label} · ${mainName} ${fmtInt(r.value)}${r.back !== undefined ? ` · ${backName} ${fmtInt(r.back)}` : ''}`}>
            <span className="a-hbar-label">{r.label}</span>
            <span className="a-hbar-track">
              {r.back !== undefined && <span style={{ width: `${(r.back / m) * 100}%`, background: '#A9C6EC' }} />}
              <span style={{ width: `${(r.value / m) * 100}%`, background: r.color ?? SERIES[0], top: r.back !== undefined ? 4 : 0, bottom: r.back !== undefined ? 4 : 0 }} />
            </span>
            <span className="a-hbar-value">{fmtInt(r.value)}{r.note && <small> {r.note}</small>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function Donut({ segments, centerLabel, centerValue, size = 180 }: {
  segments: { label: string; value: number | null; color: string; pct?: number | null }[];
  centerLabel: string; centerValue: string; size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const known = segments.map((s) => s.value ?? 0);
  const total = known.reduce((a, b) => a + b, 0);
  const r = 15.9155; // circumference 100
  let offset = 25;
  return (
    <div className="a-donut">
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg viewBox="0 0 42 42" width={size} height={size} role="img" aria-label={`${centerLabel} ${centerValue}`}>
          <circle cx="21" cy="21" r={r} fill="none" stroke="#EEF3FA" strokeWidth="6" />
          {total > 0 && segments.map((s, i) => {
            const v = ((s.value ?? 0) / total) * 100;
            if (v <= 0) return null;
            const gap = v > 1.2 ? 0.6 : 0;
            const el = (
              <circle key={i} cx="21" cy="21" r={r} fill="none" stroke={s.color} strokeWidth={hover === i ? 7 : 6}
                strokeDasharray={`${v - gap} ${100 - v + gap}`} strokeDashoffset={offset}
                onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                <title>{`${s.label}: ${fmtInt(s.value ?? 0)}`}</title>
              </circle>
            );
            offset -= v;
            return el;
          })}
        </svg>
        <div className="a-donut-center" aria-hidden="true">
          <b>{hover !== null ? (segments[hover].pct != null ? fmtPct(segments[hover].pct!) : '<5') : centerValue}</b>
          <span>{hover !== null ? segments[hover].label : centerLabel}</span>
        </div>
      </div>
      <ul className="a-donut-legend">
        {segments.map((s) => (
          <li key={s.label}>
            <span style={{ background: s.color }} />
            <span style={{ flex: 1 }}>{s.label}</span>
            <b>{s.value === null ? '<5' : fmtInt(s.value)}</b>
            <span className="a-muted" style={{ width: 52, textAlign: 'right' }}>{s.pct == null ? '—' : fmtPct(s.pct)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** One 100%-stacked bar per row (each row is one assessment with its own real band labels). */
export function StackedRows({ rows }: {
  rows: { key: string; label: string; sub?: string; n: string; segments: { label: string; color: string; pct: number | null; count: number | null }[] }[];
}) {
  return (
    <ul className="a-stack">
      {rows.map((r) => {
        const known = r.segments.reduce((s, x) => s + (x.pct ?? 0), 0);
        return (
          <li key={r.key}>
            <span className="a-stack-label"><b>{r.label}</b>{r.sub && <span>{r.sub}</span>}</span>
            <span style={{ minWidth: 0 }}>
              {known === 0 ? (
                <span className="a-stack-empty">ไม่มีข้อมูลเพียงพอ</span>
              ) : (
                <span className="a-stack-bar">
                  {r.segments.map((s) => (s.pct ?? 0) > 0 && (
                    <span key={s.label} style={{ flexGrow: s.pct!, background: s.color }} title={`${s.label}: ${s.count === null ? '<5' : fmtInt(s.count)} (${fmtPct(s.pct!)})`} />
                  ))}
                </span>
              )}
              <span className="a-stack-keys">
                {r.segments.map((s) => (
                  <span key={s.label}><i style={{ background: s.color }} />{s.label} {s.count === null ? '<5' : s.pct === null ? '0%' : fmtPct(s.pct)}</span>
                ))}
              </span>
            </span>
            <span className="a-stack-n">{r.n}</span>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------

export function ColumnChart({ labels, values, height = 160, highlight, ariaLabel, color = SERIES[0] }: {
  labels: string[]; values: number[]; height?: number; highlight?: number | null; ariaLabel: string; color?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  if (!values.some((v) => v > 0)) return <div ref={ref}><EmptyChart /></div>;
  const max = niceMax(Math.max(...values));
  const L = 34, B = 22, T = 8;
  const bw = (w - L) / values.length;
  return (
    <div ref={ref}>
      <svg width={w} height={height} role="img" aria-label={ariaLabel} style={{ display: 'block' }}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={L} x2={w} y1={T + (1 - t) * (height - T - B)} y2={T + (1 - t) * (height - T - B)} stroke={GRID} />
            <text x={L - 6} y={T + (1 - t) * (height - T - B) + 4} textAnchor="end" fontSize="11" fill={AXIS_TEXT}>{fmtInt(t * max)}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const bh = (v / max) * (height - T - B);
          return (
            <g key={i}>
              <rect x={L + i * bw + 1} y={height - B - bh} width={Math.max(1, bw - 2)} height={bh} rx={Math.min(4, bw / 3)}
                fill={highlight === i ? color : '#9DBFEA'}>
                <title>{`${labels[i]}: ${fmtInt(v)}`}</title>
              </rect>
              {(i % Math.ceil(values.length / 12) === 0) && <text x={L + i * bw + bw / 2} y={height - 6} textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>{labels[i]}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

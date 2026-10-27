import { NavLink, useNavigate } from 'react-router-dom';
import type { Band, Level } from '../../../shared/assessments.ts';
import { Icon } from './Icon.tsx';

export const TINTS: Record<string, { tint: string; ink: string }> = {
  thi15: { tint: 'tint-butter', ink: 'ink-butter' },
  st5: { tint: 'tint-peach', ink: 'ink-peach' },
  phq9: { tint: 'tint-lav', ink: 'ink-lav' },
  eq: { tint: 'tint-butter', ink: 'ink-butter' },
  rq: { tint: 'tint-mint', ink: 'ink-mint' },
  auditc: { tint: 'tint-peach', ink: 'ink-peach' },
  digital: { tint: 'tint-lav', ink: 'ink-lav' },
  memory: { tint: 'tint-mint', ink: 'ink-mint' },
  burnout: { tint: 'tint-peach', ink: 'ink-peach' }
};

export const LEVEL_COLORS: Record<Level, string> = {
  good: '#2F7458',
  mild: '#C99A2E',
  moderate: '#E9825F',
  severe: '#C2546A'
};

const BAND_FILLS: Record<Level, string> = {
  good: '#BFE8D6',
  mild: '#FFE9A8',
  moderate: '#F7B796',
  severe: '#F3A3AF'
};

export function Loading({ label = 'กำลังโหลด…' }: { label?: string }) {
  return <div className="center-page muted" role="status">{label}</div>;
}

export function LevelChip({ level, label }: { level: Level; label: string }) {
  return <span className={`chip level-${level}`}>{label}</span>;
}

export function BackButton({ to, label = 'กลับ', icon = 'back' }: { to?: string; label?: string; icon?: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" className="icon-btn" aria-label={label} onClick={() => (to ? navigate(to) : navigate(-1))}>
      <Icon name={icon} size={20} strokeWidth={2.4} />
    </button>
  );
}

const NAV = [
  { to: '/home', label: 'หน้าหลัก', icon: 'home' },
  { to: '/assessments', label: 'แบบประเมิน', icon: 'tests' },
  { to: '/history', label: 'ประวัติ', icon: 'history' },
  { to: '/care', label: 'ดูแลใจ', icon: 'heart' },
  { to: '/profile', label: 'โปรไฟล์', icon: 'user' }
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
          <span className="pill"><Icon name={n.icon} size={22} /></span>
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function HelpLineCard() {
  return (
    <a href="tel:1323" className="list-link tint-mint" style={{ boxShadow: 'none', borderRadius: 20, padding: '12px 14px' }}>
      <span className="icon-btn ink-mint" style={{ border: 0 }}><Icon name="phone" /></span>
      <span className="grow">
        <span style={{ display: 'block', fontFamily: 'var(--font-head)', fontSize: 15 }}>อยากคุยกับผู้เชี่ยวชาญ</span>
        <span className="caption" style={{ display: 'block', color: '#2F5A48', fontSize: 13 }}>สายด่วนสุขภาพจิต 1323 · ฟรี 24 ชม.</span>
      </span>
      <span className="chip" style={{ background: 'var(--mint-700)', color: '#fff', padding: '8px 14px', fontSize: 14 }}>โทร</span>
    </a>
  );
}

export function CrisisNotice() {
  return (
    <div className="alert alert-crisis" role="alert">
      ถ้าตอนนี้รู้สึกไม่ปลอดภัย คุยกับเราได้ทันทีที่ <a href="tel:1323">สายด่วนสุขภาพจิต 1323</a> ตลอด 24 ชั่วโมง
      หรือหากอยู่ในภาวะฉุกเฉิน โทร <a href="tel:1669">1669</a>
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="caption muted row" style={{ alignItems: 'flex-start', gap: 8, margin: 0 }}>
      <Icon name="info" size={16} />
      ผลนี้เป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์ หากมีข้อกังวลควรปรึกษาแพทย์หรือนักจิตวิทยา
    </p>
  );
}

export function ScoreGauge({ score, max, level, size = 136 }: { score: number; max: number; level: Level; size?: number }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const dash = max > 0 ? (score / max) * c : 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label={`คะแนน ${score} จาก ${max}`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#F3EAE0" strokeWidth="14" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={LEVEL_COLORS[level]} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`} transform="rotate(-90 70 70)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 500, fontSize: 38, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 13 }} className="muted">จาก {max} คะแนน</span>
      </div>
    </div>
  );
}

export function BandScale({ bands, current }: { bands: Band[]; current: Band }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bands.length}, minmax(0, 1fr))`, gap: 4 }} aria-hidden="true">
      {bands.map((b, i) => {
        const active = b === current;
        return (
          <div key={i}>
            <div style={{
              height: 8,
              background: BAND_FILLS[b.level],
              borderRadius: i === 0 ? '999px 0 0 999px' : i === bands.length - 1 ? '0 999px 999px 0' : 0,
              outline: active ? '2px solid #3A2E2A' : undefined,
              outlineOffset: 1
            }} />
            <div style={{ fontSize: 12, textAlign: 'center', marginTop: 4, fontWeight: active ? 600 : 400 }} className={active ? undefined : 'muted'}>
              {b.min}–{b.max}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface TrendPoint { label: string; value: number }

export function TrendChart({ points, max, bands, ariaLabel }: { points: TrendPoint[]; max: number; bands: Band[]; ariaLabel: string }) {
  const W = 326, top = 12, bottom = 150, left = 34, right = 300;
  const yOf = (v: number) => bottom - (v / max) * (bottom - top);
  const xOf = (i: number) => (points.length === 1 ? (left + right) / 2 : left + (i * (right - left)) / (points.length - 1));
  const coords = points.map((p, i) => [xOf(i), yOf(p.value)] as const);
  const last = coords[coords.length - 1];
  return (
    <svg width="100%" viewBox={`0 0 ${W} 186`} role="img" aria-label={ariaLabel} style={{ display: 'block' }}>
      {bands.map((b, i) => (
        <rect key={i} x={left - 6} width={right - left + 16} y={yOf(b.max + (i === bands.length - 1 ? 0 : 1))}
          height={yOf(b.min) - yOf(b.max + (i === bands.length - 1 ? 0 : 1))} fill={BAND_FILLS[b.level]} opacity="0.45" />
      ))}
      <text x="26" y="155" textAnchor="end" fontSize="12" fill="#75675F">0</text>
      <text x="26" y="20" textAnchor="end" fontSize="12" fill="#75675F">{max}</text>
      {coords.length > 1 && (
        <path d={'M' + coords.map((c) => `${c[0]} ${c[1]}`).join('L')} fill="none" stroke="#6B54C4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {coords.map((c, i) => (
        <circle key={i} cx={c[0]} cy={c[1]} r="4.5" fill="#fff" stroke="#6B54C4" strokeWidth="3" />
      ))}
      {last && <text x={last[0]} y={last[1] - 12} textAnchor="middle" fontSize="13" fontWeight="600" fill="#3A2E2A">{points[points.length - 1].value}</text>}
      {points.map((p, i) => (
        <text key={i} x={xOf(i)} y="176" textAnchor="middle" fontSize="12" fill="#75675F">{p.label}</text>
      ))}
    </svg>
  );
}

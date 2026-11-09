import { createContext, useContext, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.tsx';
import { Icon } from '../components/Icon.tsx';
import { thaiDay, type RangeQuery } from './adminApi.ts';

type Preset = 'today' | '7d' | '30d' | 'month' | 'year' | 'custom';
const PRESETS: { id: Preset; label: string }[] = [
  { id: 'today', label: 'วันนี้' },
  { id: '7d', label: '7 วัน' },
  { id: '30d', label: '30 วัน' },
  { id: 'month', label: 'เดือนนี้' },
  { id: 'year', label: 'ปีนี้' },
  { id: 'custom', label: 'กำหนดเอง' }
];

const MENU = [
  { to: '/admin', label: 'Dashboard ภาพรวม', icon: 'home', end: true },
  { to: '/admin/users', label: 'สถิติผู้ใช้งาน', icon: 'users' },
  { to: '/admin/assessments', label: 'สถิติแบบประเมิน', icon: 'tests' },
  { to: '/admin/risk', label: 'วิเคราะห์ระดับความเสี่ยง', icon: 'shield' },
  { to: '/admin/reports', label: 'รายงานผล', icon: 'file' },
  { to: '/admin/assessment-config', label: 'จัดการแบบประเมิน', icon: 'pen' },
  { to: '/admin/roles', label: 'ผู้ใช้งานและสิทธิ์', icon: 'lock' },
  { to: '/admin/settings', label: 'ตั้งค่าระบบ', icon: 'settings' }
];

/** Today in Thailand, YYYY-MM-DD. */
export function thaiToday(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}
function shift(d: string, days: number) {
  const x = new Date(d + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + days);
  return x.toISOString().slice(0, 10);
}
function presetRange(p: Preset): RangeQuery {
  const t = thaiToday();
  switch (p) {
    case 'today': return { from: t, to: t };
    case '7d': return { from: shift(t, -6), to: t };
    case 'month': return { from: t.slice(0, 8) + '01', to: t };
    case 'year': return { from: t.slice(0, 5) + '01-01', to: t };
    default: return { from: shift(t, -29), to: t };
  }
}

interface RangeCtx { range: RangeQuery; preset: Preset; label: string }
const Ctx = createContext<RangeCtx | null>(null);
export const useRange = () => useContext(Ctx)!;

export function rangeLabel(r: RangeQuery) {
  return r.from === r.to ? thaiDay(r.from) : `${thaiDay(r.from)} – ${thaiDay(r.to)}`;
}

export function AdminLayout() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const preset = (PRESETS.some((p) => p.id === params.get('p')) ? params.get('p') : '30d') as Preset;
  const range: RangeQuery = preset === 'custom' && params.get('from') && params.get('to')
    ? { from: params.get('from')!, to: params.get('to')! }
    : presetRange(preset);

  function choose(p: Preset) {
    const next = new URLSearchParams(params);
    next.set('p', p);
    if (p === 'custom') { next.set('from', range.from); next.set('to', range.to); } else { next.delete('from'); next.delete('to'); }
    setParams(next, { replace: true });
  }
  function setCustom(key: 'from' | 'to', value: string) {
    if (!value) return;
    const next = new URLSearchParams(params);
    next.set('p', 'custom');
    next.set('from', key === 'from' ? value : range.from);
    next.set('to', key === 'to' ? value : range.to);
    setParams(next, { replace: true });
  }

  const search = params.toString() ? `?${params.toString()}` : '';
  const current = MENU.find((m) => (m.end ? location.pathname === m.to : location.pathname.startsWith(m.to))) ?? MENU[0];
  const showRange = !['/admin/assessment-config', '/admin/roles', '/admin/settings'].includes(location.pathname);

  return (
    <Ctx.Provider value={{ range, preset, label: rangeLabel(range) }}>
      <div className="admin">
        <aside className={`admin-side no-print${menuOpen ? ' open' : ''}`}>
          <div className="admin-brand">
            <span className="brand-mark" style={{ background: '#fff' }}><Icon name="sprout" size={20} /></span>
            <span><b>MindEase</b><span>{user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้วิเคราะห์ข้อมูล (ดูอย่างเดียว)'}</span></span>
            <button type="button" className="admin-menu-btn" aria-label="เมนู" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}><Icon name="menu" /></button>
          </div>
          <nav aria-label="เมนูผู้ดูแลระบบ">
            {MENU.map((m) => (
              <NavLink key={m.to} to={m.to + search} end={m.end} onClick={() => setMenuOpen(false)}>
                <Icon name={m.icon} size={18} />{m.label}
              </NavLink>
            ))}
          </nav>
          <Link to="/home" className="admin-back"><Icon name="back" size={16} />กลับไปหน้าผู้ใช้</Link>
        </aside>

        <div className="admin-main">
          <header className="admin-top">
            <div style={{ marginRight: 'auto', minWidth: 0 }}>
              <h1>{current.label}</h1>
              {showRange && <div className="a-sub">ช่วงที่วิเคราะห์: {rangeLabel(range)} · เวลาประเทศไทย</div>}
            </div>
            {showRange && (
              <div className="admin-range no-print">
                <div className="seg" role="group" aria-label="ช่วงเวลา">
                  {PRESETS.map((p) => (
                    <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => choose(p.id)}>{p.label}</button>
                  ))}
                </div>
                {preset === 'custom' && (
                  <div className="row" style={{ gap: 6 }}>
                    <label className="sr-only" htmlFor="r-from">ตั้งแต่</label>
                    <input id="r-from" type="date" value={range.from} max={range.to} onChange={(e) => setCustom('from', e.target.value)} />
                    <span className="a-muted">ถึง</span>
                    <label className="sr-only" htmlFor="r-to">ถึง</label>
                    <input id="r-to" type="date" value={range.to} min={range.from} max={thaiToday()} onChange={(e) => setCustom('to', e.target.value)} />
                  </div>
                )}
              </div>
            )}
            {showRange && (
              <Link to={'/admin/reports' + search} className="btn btn-primary no-print" style={{ minHeight: 44, fontSize: 15, padding: '0 18px' }}>
                <Icon name="download" size={18} />Export Report
              </Link>
            )}
            <div className="admin-account no-print">
              <span>{(user?.displayName ?? '?').slice(0, 1)}</span>
              <span><b>{user?.displayName}</b><small>{user?.role === 'admin' ? 'admin' : 'analyst'}</small></span>
            </div>
          </header>
          <div className="admin-content">
            <Outlet />
          </div>
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function TrackingNote({ since }: { since: string | null }) {
  if (!since) return null;
  const d = new Date(since);
  const day = new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
  return (
    <div className="a-note">
      <Icon name="info" size={16} />
      ข้อมูลการเข้าใช้งานและการ “เริ่มทำ” แบบประเมิน เริ่มเก็บตั้งแต่ {thaiDay(day)} ช่วงก่อนหน้านั้นจะมีเฉพาะจำนวนที่ทำสำเร็จ
    </div>
  );
}

export function Kpi({ label, value, note, icon, tone }: { label: string; value: ReactNode; note?: ReactNode; icon: string; tone?: string }) {
  return (
    <div className="a-kpi">
      <span className="a-kpi-label"><span className="a-kpi-icon" style={tone ? { background: tone } : undefined}><Icon name={icon} size={16} /></span>{label}</span>
      <span className="a-kpi-value">{value}</span>
      {note && <span className="a-kpi-note">{note}</span>}
    </div>
  );
}

export function AdminState({ error, loading, hasData }: { error: string; loading: boolean; hasData: boolean }) {
  if (error) return <div className="alert alert-error" role="alert">{error}</div>;
  if (loading && !hasData) return <div className="a-empty" role="status">กำลังโหลดข้อมูล…</div>;
  return null;
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ASSESSMENTS, getAssessment } from '../../../shared/assessments.ts';
import { api, isStaff, thaiDate, useLiveData, type Stats } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { Icon } from '../components/Icon.tsx';
import { ACCENTS, AssessmentIcon, LevelChip } from '../components/ui.tsx';

const MOODS = [
  { label: 'แย่มาก', fill: '#F6C1C9', mouth: 'M9 17q3-3 6 0' },
  { label: 'ไม่ค่อยดี', fill: '#FFD9C2', mouth: 'M9 16.5q3-1.5 6 0' },
  { label: 'เฉยๆ', fill: '#FFF1C9', mouth: 'M9 16h6' },
  { label: 'ดี', fill: '#D8F1E4', mouth: 'M9 15q3 2.5 6 0' },
  { label: 'ดีมาก', fill: '#BFE8D6', mouth: 'M8.5 14.5q3.5 4 7 0' }
];

/** Short names that fit the 3-column tile grid. */
const SHORT: Record<string, string> = {
  thi15: 'ความสุข', st5: 'ความเครียด', phq9: 'ซึมเศร้า', eq: 'ความฉลาดทางอารมณ์', rq: 'พลังสุขภาพจิต',
  auditc: 'แอลกอฮอล์', digital: 'เกม/หน้าจอ', memory: 'ความจำ/สมาธิ', burnout: 'ภาวะหมดไฟ'
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'สวัสดีตอนเช้า';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [savingMood, setSavingMood] = useState(false);
  const [disabled, setDisabled] = useState<string[]>([]);

  useLiveData(() => {
    api.stats().then((s) => {
      setStats(s);
      setMood(s.todayMood);
    }).catch(() => undefined);
    api.availability().then((r) => setDisabled(r.disabled)).catch(() => undefined);
  });

  async function pickMood(i: number) {
    setMood(i);
    setSavingMood(true);
    try {
      await api.setMood(i);
      const s = await api.stats();
      setStats(s);
    } finally {
      setSavingMood(false);
    }
  }

  const latest = stats?.latest;
  const latestDef = latest ? getAssessment(latest.assessmentId) : undefined;

  return (
    <main className="screen">
      <header className="card card-lg row" style={{ background: 'linear-gradient(160deg, #DDEBFF, #F4F9FF)', padding: '0 0 0 18px', overflow: 'hidden', alignItems: 'flex-end', minHeight: 140 }}>
        <div className="grow" style={{ alignSelf: 'center', padding: '16px 0' }}>
          <div className="small muted">{greeting()}</div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 500, fontSize: 22, color: 'var(--heading)' }}>คุณ{user?.displayName}</div>
          {isStaff(user) && (
            <Link to="/admin" className="chip" style={{ marginTop: 8, background: 'var(--lav-600)', color: '#fff', textDecoration: 'none' }}>
              <Icon name="chart" size={14} />แดชบอร์ดผู้ดูแลระบบ
            </Link>
          )}
        </div>
        <img src="/illustrations/wave.webp" alt="" width="160" height="171" style={{ width: 'min(160px, 42%)', height: 'auto', display: 'block' }} />
      </header>

      <section className="card" aria-labelledby="mood-h">
        <h2 id="mood-h" className="h2">วันนี้ใจคุณเป็นอย่างไร?</h2>
        <p className="small muted" style={{ margin: '2px 0 12px' }} aria-live="polite">
          {mood === null ? 'แตะเพื่อบันทึกอารมณ์ประจำวัน' : `บันทึกแล้ว: รู้สึก${MOODS[mood].label}${savingMood ? '…' : ' · แตะเพื่อเปลี่ยน'}`}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
          {MOODS.map((m, i) => (
            <button key={m.label} type="button" className="mood-btn" aria-pressed={mood === i} onClick={() => pickMood(i)}>
              <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill={m.fill} stroke="#1B2B45" strokeWidth="1.6" />
                <circle cx="9" cy="10" r="1.2" fill="#1B2B45" /><circle cx="15" cy="10" r="1.2" fill="#1B2B45" />
                <path d={m.mouth} fill="none" stroke="#1B2B45" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid-2">
        <div className="card tint-peach row" style={{ boxShadow: 'none', borderRadius: 20 }}>
          <span className="icon-btn ink-peach" style={{ border: 0 }}><Icon name="flame" size={22} /></span>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, lineHeight: 1.2 }}>{stats?.streak ?? 0} วัน</div>
            <div className="small" style={{ color: '#6B4A3C' }}>บันทึกต่อเนื่อง</div>
          </div>
        </div>
        <div className="card tint-mint row" style={{ boxShadow: 'none', borderRadius: 20 }}>
          <span className="icon-btn ink-mint" style={{ border: 0 }}><Icon name="check" size={22} strokeWidth={2.2} /></span>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, lineHeight: 1.2 }}>{stats?.totalResults ?? 0} ครั้ง</div>
            <div className="small" style={{ color: '#2F5A48' }}>ประเมินแล้ว</div>
          </div>
        </div>
      </div>

      {latest && latestDef ? (
        <Link to={`/results/${latest.id}`} className="list-link" style={{ borderRadius: 20, padding: '12px 14px' }}>
          <AssessmentIcon id={latestDef.id} icon={latestDef.icon} size={44} />
          <span className="grow">
            <span className="caption muted" style={{ display: 'block' }}>ผลล่าสุด · {thaiDate(latest.createdAt)}</span>
            <span style={{ display: 'block', fontFamily: 'var(--font-head)', fontSize: 16 }}>{latestDef.code} · {latest.score}/{latest.max}</span>
          </span>
          <LevelChip level={latest.level} label={latest.bandLabel} />
        </Link>
      ) : (
        <div className="card tint-lav row" style={{ boxShadow: 'none' }}>
          <Avatar config={user?.avatar} size={56} bg="#fff" mood="happy" />
          <p className="small" style={{ margin: 0 }}>ยังไม่มีผลการประเมิน ลองเริ่มจาก <Link to="/assessments/st5">ST-5</Link> ใช้เวลาแค่ 2 นาที</p>
        </div>
      )}

      <section>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 className="h2">แบบประเมิน</h2>
          <Link to="/assessments" className="small" style={{ fontWeight: 600, textDecoration: 'none', padding: '6px 0' }}>ดูทั้งหมด ›</Link>
        </div>
        <div className="tile-grid">
          {ASSESSMENTS.filter((a) => !disabled.includes(a.id)).map((a) => (
            <Link key={a.id} to={`/assessments/${a.id}`} className="tile" style={{ background: ACCENTS[a.id].tint }} aria-label={`${a.name} (${a.code})`}>
              <AssessmentIcon id={a.id} icon={a.icon} size={44} />
              {SHORT[a.id] ?? a.name}
            </Link>
          ))}
        </div>
      </section>

      <Link to="/care" className="card tint-butter row" style={{ boxShadow: 'none', textDecoration: 'none', color: 'var(--ink)' }}>
        <span className="icon-btn ink-butter" style={{ border: 0 }}><Icon name="wind" /></span>
        <span className="grow small"><strong style={{ fontFamily: 'var(--font-head)', fontWeight: 500 }}>เคล็ดลับวันนี้</strong><br />หายใจลึกๆ ช้าๆ 3 ครั้งก่อนเริ่มงาน ช่วยให้ใจนิ่งขึ้น</span>
        <Icon name="next" size={18} />
      </Link>
    </main>
  );
}

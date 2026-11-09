import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getAssessment } from '../../../shared/assessments.ts';
import { api, isStaff, thaiDate, useLiveData, type Stats } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Icon } from '../components/Icon.tsx';
import { AssessmentCards } from '../components/AssessmentCards.tsx';
import { AssessmentIcon, LevelChip } from '../components/ui.tsx';

const MOODS = [
  { label: 'แย่มาก', fill: '#F6C1C9', mouth: 'M9 17q3-3 6 0' },
  { label: 'ไม่ค่อยดี', fill: '#FFD9C2', mouth: 'M9 16.5q3-1.5 6 0' },
  { label: 'เฉยๆ', fill: '#FFF1C9', mouth: 'M9 16h6' },
  { label: 'ดี', fill: '#D8F1E4', mouth: 'M9 15q3 2.5 6 0' },
  { label: 'ดีมาก', fill: '#BFE8D6', mouth: 'M8.5 14.5q3.5 4 7 0' }
];

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
    <main className="screen wide signed-in">
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="hero-sub" style={{ color: 'var(--muted)', margin: '0 0 6px' }}>{greeting()}</p>
            <h1 className="hero-title home-title">คุณ{user?.displayName}<br /><span>วันนี้ใจเป็นอย่างไร?</span></h1>
            <p className="hero-lead">ดูแลใจ…ให้แข็งแรง</p>
            <p className="hero-meta">เช็กใจด้วยแบบประเมิน หรือบันทึกอารมณ์ของวันนี้ได้ด้านล่าง</p>
            {isStaff(user) && (
              <Link to="/admin" className="chip" style={{ marginTop: 14, background: 'var(--lav-600)', color: '#fff', textDecoration: 'none', padding: '8px 14px' }}>
                <Icon name="chart" size={16} />แดชบอร์ดผู้ดูแลระบบ
              </Link>
            )}
          </div>
          <div className="hero-art">
            <div className="hero-bubble">ยินดีต้อนรับกลับมา<br />วันนี้ดูแลใจไปด้วยกันนะ <span style={{ color: '#E5566F' }}>♥</span></div>
            <img src="/illustrations/wave.webp" alt="ตัวละครคู่ใจ MindEase โบกมือทักทาย" width="465" height="496" />
          </div>
        </div>

        <div className="hero-features">
          <div className="feature">
            <span className="icon-circle" style={{ background: '#E26A1B' }}><Icon name="flame" size={22} /></span>
            <span><b>{stats?.streak ?? 0} วัน</b><span>บันทึกอารมณ์ต่อเนื่อง</span></span>
          </div>
          <div className="feature">
            <span className="icon-circle" style={{ background: '#2E9E62' }}><Icon name="check" size={22} strokeWidth={2.4} /></span>
            <span><b>{stats?.totalResults ?? 0} ครั้ง</b><span>ประเมินแล้ว</span></span>
          </div>
          {latest && latestDef ? (
            <Link to={`/results/${latest.id}`} className="feature" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
              <AssessmentIcon id={latestDef.id} icon={latestDef.icon} size={46} />
              <span className="grow" style={{ minWidth: 0 }}>
                <b>{latestDef.code} · {latest.score}/{latest.max}</b>
                <span>ผลล่าสุด · {thaiDate(latest.createdAt)}</span>
              </span>
              <LevelChip level={latest.level} label={latest.bandLabel} />
            </Link>
          ) : (
            <Link to="/assessments/st5" className="feature" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
              <span className="icon-circle" style={{ background: '#1E63C4' }}><Icon name="tests" size={22} /></span>
              <span><b>ยังไม่มีผลการประเมิน</b><span>ลองเริ่มจาก ST-5 ใช้เวลา 2 นาที</span></span>
            </Link>
          )}
        </div>

        <div className="hero-cta">
          <Link to="/assessments" className="btn btn-primary btn-lg">เริ่มทำแบบประเมิน <Icon name="arrow" size={20} strokeWidth={2.4} /></Link>
          <span className="small"><Link to="/history" style={{ fontWeight: 600 }}>ดูประวัติและแนวโน้ม</Link></span>
        </div>
      </section>

      <div className="home-row">
        <section className="card" aria-labelledby="mood-h">
          <h2 id="mood-h" className="h2">บันทึกอารมณ์วันนี้</h2>
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

        <Link to="/care" className="home-tip">
          <span className="icon-circle" style={{ background: '#FFE9A6', color: '#7A5200' }}><Icon name="bulb" size={22} /></span>
          <span className="grow">
            <b>เคล็ดลับวันนี้</b>
            <span>หายใจลึกๆ ช้าๆ 3 ครั้งก่อนเริ่มงาน ช่วยให้ใจนิ่งขึ้น</span>
            <span className="home-tip-link">ไปที่ดูแลใจ ›</span>
          </span>
          <img src="/illustrations/plant.webp" alt="" width="300" height="408" />
        </Link>
      </div>

      <section style={{ paddingTop: 16 }}>
        <AssessmentCards disabled={disabled} eyebrow="เช็กใจวันนี้" />
      </section>
    </main>
  );
}

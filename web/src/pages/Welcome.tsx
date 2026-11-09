import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ASSESSMENTS, CATEGORIES, type CategoryId } from '../../../shared/assessments.ts';
import { Icon } from '../components/Icon.tsx';
import { ACCENTS } from '../components/ui.tsx';

const TOTAL_ITEMS = ASSESSMENTS.reduce((s, a) => s + a.items.length, 0);
const CAT_LABELS: Record<CategoryId, string> = { mood: 'อารมณ์', strength: 'จุดแข็งทางใจ', life: 'พฤติกรรม', work: 'สมอง/งาน' };

const FEATURES = [
  { icon: 'tests', bg: '#1E63C4', title: 'ประเมินง่าย', text: 'ตอบทีละข้อ ใช้ได้ทุกที่' },
  { icon: 'clock', bg: '#7A58D6', title: 'ใช้เวลาไม่นาน', text: 'ชุดละ 1–5 นาที' },
  { icon: 'shield', bg: '#2E9E62', title: 'ปลอดภัย', text: 'ข้อมูลเป็นความลับ' }
];

export function Welcome() {
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const shown = ASSESSMENTS.filter((a) => cat === 'all' || a.category === cat);

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-wrap landing-header-row">
          <Link to="/" className="brand">
            <span className="brand-mark"><Icon name="sprout" size={22} /></span>
            <span>
              <span className="brand-name">MindEase</span>
              <span className="brand-sub">ระบบประเมินสุขภาพจิตเบื้องต้น</span>
            </span>
          </Link>
          <nav aria-label="เมนูหลัก" className="landing-nav">
            <a href="#assessments">แบบประเมิน</a>
            <a href="#before">ก่อนเริ่มประเมิน</a>
          </nav>
          <Link to="/login" className="btn btn-primary landing-login">เข้าสู่ระบบ</Link>
        </div>
      </header>

      <main>
        <div className="landing-wrap" style={{ paddingTop: 24 }}>
          <section className="hero">
            <div className="hero-grid">
              <div className="hero-copy">
                <h1 className="hero-title">แบบประเมิน<br /><span>สุขภาพจิต</span></h1>
                <p className="hero-lead">ดูแลใจ…ให้แข็งแรง</p>
                <p className="hero-sub">เริ่มได้จากการประเมินตัวเอง</p>
                <p className="hero-meta">แบบประเมิน {ASSESSMENTS.length} ด้าน รวม {TOTAL_ITEMS} ข้อคำถาม</p>
              </div>
              <div className="hero-art">
                <div className="hero-bubble">สุขภาพจิตดี<br />เริ่มได้จากการดูแลใจ<br />ในทุกวัน <span style={{ color: '#E5566F' }}>♥</span></div>
                <img src="/illustrations/hug.webp" alt="ตัวละครคู่ใจ MindEase กอดหัวใจ" width="382" height="495" />
              </div>
            </div>

            <div className="hero-features">
              {FEATURES.map((f) => (
                <div key={f.title} className="feature">
                  <span className="icon-circle" style={{ background: f.bg }}><Icon name={f.icon} size={22} /></span>
                  <span><b>{f.title}</b><span>{f.text}</span></span>
                </div>
              ))}
            </div>

            <div className="hero-cta">
              <Link to="/register" className="btn btn-primary btn-lg">เริ่มทำแบบประเมิน <Icon name="arrow" size={20} strokeWidth={2.4} /></Link>
              <span className="small">มีบัญชีแล้ว? <Link to="/login" style={{ fontWeight: 600 }}>เข้าสู่ระบบ</Link></span>
            </div>
          </section>
        </div>

        <section id="assessments" className="landing-wrap landing-section">
          <span className="eyebrow"><span />เลือกแบบประเมินที่ตรงกับคุณ</span>
          <div className="section-head">
            <h2>แบบประเมินสุขภาพจิต {ASSESSMENTS.length} ประเภท</h2>
            <div className="seg" role="group" aria-label="กรองตามหมวด">
              <button type="button" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>ทั้งหมด</button>
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{CAT_LABELS[c.id]}</button>
              ))}
            </div>
          </div>
          <p className="section-sub">ทำได้ฟรี ใช้เวลาชุดละ 1–5 นาที ผลเป็นการคัดกรองเบื้องต้นพร้อมคำแนะนำทันที</p>

          <div className="tcard-grid">
            {shown.map((a) => {
              const acc = ACCENTS[a.id];
              return (
                <Link key={a.id} to={`/assessments/${a.id}`} className="tcard">
                  <span className="tcard-blob" style={{ background: acc.tint }} aria-hidden="true" />
                  <span className="tcard-top">
                    <span className="tcard-icon" style={{ background: acc.c, boxShadow: `0 8px 18px ${acc.c}47` }}><Icon name={a.icon} size={28} /></span>
                    <span className="tcard-code">{a.code}</span>
                  </span>
                  <span className="tcard-name">{a.name}</span>
                  <span className="tcard-desc">{a.intro}</span>
                  <span className="tcard-meta">
                    <span><Icon name="tests" size={16} />{a.items.length} ข้อ</span>
                    <span><Icon name="clock" size={16} />{a.minutes} นาที</span>
                    {a.status === 'draft' && <span className="chip level-mild" style={{ fontSize: 12, padding: '2px 8px' }}>ฉบับทดลอง</span>}
                    <span className="tcard-go"><Icon name="arrow" size={18} strokeWidth={2.4} /></span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section id="before" className="landing-wrap landing-section" style={{ paddingTop: 8 }}>
          <div className="before-card">
            <span className="icon-circle" style={{ background: '#FFE9A6', color: '#7A5200' }}><Icon name="bulb" size={22} /></span>
            <p><b>คำแนะนำก่อนประเมิน</b> ตอบตามความรู้สึกจริงในช่วงที่ผ่านมา ไม่มีคำตอบถูกหรือผิด ผลเป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์</p>
            <a href="tel:1323" className="hotline"><Icon name="phone" size={18} />สายด่วนสุขภาพจิต 1323</a>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap">ผลการประเมินใช้เพื่อคัดกรองเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัยทางการแพทย์ · ข้อมูลของคุณได้รับการคุ้มครองตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล</div>
      </footer>
    </div>
  );
}

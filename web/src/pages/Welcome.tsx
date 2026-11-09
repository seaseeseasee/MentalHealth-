import { Link } from 'react-router-dom';
import { ASSESSMENTS } from '../../../shared/assessments.ts';
import { AssessmentCards } from '../components/AssessmentCards.tsx';
import { Icon } from '../components/Icon.tsx';

const TOTAL_ITEMS = ASSESSMENTS.reduce((s, a) => s + a.items.length, 0);

const FEATURES = [
  { icon: 'tests', bg: '#1E63C4', title: 'ประเมินง่าย', text: 'ตอบทีละข้อ ใช้ได้ทุกที่' },
  { icon: 'clock', bg: '#7A58D6', title: 'ใช้เวลาไม่นาน', text: 'ชุดละ 1–5 นาที' },
  { icon: 'shield', bg: '#2E9E62', title: 'ปลอดภัย', text: 'ข้อมูลเป็นความลับ' }
];

export function Welcome() {
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
          <AssessmentCards />
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

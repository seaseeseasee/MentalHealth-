import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar.tsx';
import { Icon } from '../components/Icon.tsx';

export function Welcome() {
  return (
    <main className="screen no-nav" style={{ gap: 0 }}>
      <header className="row" style={{ justifyContent: 'space-between', minHeight: 44 }}>
        <div className="row" style={{ gap: 8 }}>
          <img src="/favicon.svg" width="30" height="30" alt="" />
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 500, fontSize: 20 }}>MindEase</span>
        </div>
        <Link to="/login" className="small" style={{ color: 'var(--muted)', textDecoration: 'none', padding: '12px 4px' }}>เข้าสู่ระบบ</Link>
      </header>

      <div style={{ position: 'relative', height: 320, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 342 320" width="100%" height="320" aria-hidden="true" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid meet">
          <path d="M171 26 C240 20 304 66 310 146 C316 228 262 296 176 300 C92 304 34 250 32 168 C30 88 98 32 171 26 Z" fill="#FFE3D3" />
          <path d="M44 84 C44 54 68 42 92 44 C92 70 72 86 44 84 Z" fill="#BFE8D6" stroke="#2F7458" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M48 80 L80 54" stroke="#2F7458" strokeWidth="2" strokeLinecap="round" />
          <circle cx="300" cy="58" r="11" fill="#D9CCF5" />
          <circle cx="38" cy="256" r="14" fill="#D9CCF5" />
          <circle cx="296" cy="270" r="7" fill="#FFD27A" />
          <path d="M238 300 c10 -10 20 10 30 0 s20 10 30 0" fill="none" stroke="#E9825F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M58 168 v14 M51 175 h14 M284 184 v10 M279 189 h10" stroke="#6B54C4" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div style={{ position: 'relative', marginTop: 30 }}>
          <Avatar size={210} label="เพื่อนคู่ใจของ MindEase" />
        </div>
        <div className="bubble" style={{ position: 'absolute', top: 6, right: 0 }}>สวัสดีนะ!<br />วันนี้ใจเป็นยังไงบ้าง?</div>
      </div>

      <h1 className="h-display" style={{ margin: '24px 0 8px' }}>พื้นที่ปลอดภัย<br />สำหรับดูแลใจคุณ</h1>
      <p className="muted" style={{ margin: 0, lineHeight: 1.65 }}>
        เช็กสุขภาพใจด้วยแบบประเมิน 9 ชุด พร้อมเพื่อนคู่ใจที่อยู่ข้างคุณทุกขั้นตอน
      </p>

      <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        <span className="chip" style={{ background: '#fff', border: '1px solid var(--line)', fontWeight: 400 }}><span className="ink-lav"><Icon name="tests" size={16} /></span>9 แบบประเมิน</span>
        <span className="chip" style={{ background: '#fff', border: '1px solid var(--line)', fontWeight: 400 }}><span className="ink-mint"><Icon name="clock" size={16} /></span>1–5 นาที</span>
        <span className="chip" style={{ background: '#fff', border: '1px solid var(--line)', fontWeight: 400 }}><span className="ink-peach"><Icon name="lock" size={16} /></span>ข้อมูลปลอดภัย PDPA</span>
      </div>

      <div style={{ flexGrow: 1, minHeight: 24 }} />

      <Link to="/register" className="btn btn-primary btn-lg btn-block">เริ่มต้นเลย <Icon name="arrow" size={20} strokeWidth={2.5} /></Link>
      <p className="small muted" style={{ textAlign: 'center', margin: '12px 0 0' }}>
        มีบัญชีอยู่แล้ว? <Link to="/login" style={{ fontWeight: 600 }}>เข้าสู่ระบบ</Link>
      </p>
      <p className="caption muted" style={{ textAlign: 'center', margin: '10px 0 0' }}>
        ผลการประเมินใช้เพื่อคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์
      </p>
    </main>
  );
}

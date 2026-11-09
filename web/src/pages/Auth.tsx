import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Icon } from '../components/Icon.tsx';

const POINTS = [
  { icon: 'tests', bg: '#1E63C4', text: 'แบบประเมิน 9 ด้าน ใช้เวลาชุดละ 1–5 นาที' },
  { icon: 'history', bg: '#7A58D6', text: 'บันทึกผลและดูแนวโน้มของตัวเองได้' },
  { icon: 'shield', bg: '#2E9E62', text: 'ข้อมูลเป็นความลับ ลบได้ทุกเมื่อ' }
];

/** Split layout: illustration panel beside the form on desktop, a compact banner above it on mobile. */
function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-art">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark"><Icon name="sprout" size={22} /></span>
          <span><span className="brand-name">MindEase</span><span className="brand-sub">ระบบประเมินสุขภาพจิตเบื้องต้น</span></span>
        </Link>
        <div className="auth-art-copy">
          <p className="auth-art-title">ดูแลใจ…ให้แข็งแรง</p>
          <p className="auth-art-sub">เริ่มได้จากการประเมินตัวเอง</p>
        </div>
        <img src="/illustrations/hug.webp" alt="" width="382" height="495" className="auth-art-img" />
        <ul className="auth-points">
          {POINTS.map((p) => (
            <li key={p.text}><span className="icon-circle" style={{ width: 34, height: 34, background: p.bg }}><Icon name={p.icon} size={17} /></span>{p.text}</li>
          ))}
        </ul>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <Link to="/" className="auth-back"><Icon name="back" size={18} />กลับหน้าแรก</Link>
          <h1 className="h1" style={{ fontSize: 26 }}>{title}</h1>
          <p className="muted small" style={{ margin: '4px 0 20px' }}>{subtitle}</p>
          {children}
          <p className="small muted" style={{ textAlign: 'center', margin: '16px 0 0' }}>{footer}</p>
        </div>
      </main>
    </div>
  );
}

export function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api.login({ email, password });
      setUser(user);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/home', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="ยินดีต้อนรับกลับมา"
      subtitle="เข้าสู่ระบบเพื่อดูผลและแนวโน้มของคุณ"
      footer={<>ยังไม่มีบัญชี? <Link to="/register" style={{ fontWeight: 600 }}>สมัครใช้งาน</Link></>}
    >
      <form onSubmit={submit} className="stack" style={{ gap: 14 }}>
        <label className="field">อีเมล
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">รหัสผ่าน
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api.register({ displayName, email, password, consent });
      setUser(user);
      navigate('/profile?welcome=1', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="เริ่มต้นดูแลใจ"
      subtitle="สร้างบัญชีเพื่อบันทึกผลและติดตามแนวโน้ม"
      footer={<>มีบัญชีอยู่แล้ว? <Link to="/login" style={{ fontWeight: 600 }}>เข้าสู่ระบบ</Link></>}
    >
      <form onSubmit={submit} className="stack" style={{ gap: 14 }}>
        <label className="field">ชื่อที่ให้เราเรียก
          <input autoComplete="nickname" required maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="เช่น มายด์" />
        </label>
        <label className="field">อีเมล
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)
          <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <div className="auth-consent">
          <strong className="row" style={{ gap: 8, fontFamily: 'var(--font-head)', fontWeight: 500, color: 'var(--heading)' }}><Icon name="lock" size={18} />ความเป็นส่วนตัวของคุณ (PDPA)</strong>
          <p style={{ margin: '4px 0 10px' }}>
            เราเก็บคำตอบ ผลการประเมิน และบันทึกอารมณ์ของคุณ เพื่อแสดงผลและแนวโน้มให้คุณ
            ผู้ดูแลระบบเห็นเฉพาะสถิติภาพรวมที่ไม่ระบุตัวบุคคล (เช่น จำนวนผู้ทำแบบประเมินในแต่ละระดับ) เพื่อปรับปรุงบริการ
            ไม่เปิดเผยคำตอบหรือผลรายบุคคลต่อผู้อื่น คุณดาวน์โหลดหรือลบข้อมูลทั้งหมดได้ทุกเมื่อจากหน้าโปรไฟล์
          </p>
          <label className="row" style={{ gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
            <input type="checkbox" className="switch" checked={consent} onChange={(e) => setConsent(e.target.checked)} required style={{ marginTop: 2 }} />
            <span>ฉันยินยอมให้เก็บและใช้ข้อมูลสุขภาพตามที่ระบุข้างต้น</span>
          </label>
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy || !consent}>{busy ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชี'}</button>
      </form>
    </AuthShell>
  );
}

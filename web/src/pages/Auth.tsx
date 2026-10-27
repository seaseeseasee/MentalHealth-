import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { BackButton } from '../components/ui.tsx';

function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <BackButton to="/" />
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="grow">
          <h1 className="h1">{title}</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>{subtitle}</p>
        </div>
        <Avatar size={84} bg="var(--peach-50)" />
      </div>
    </>
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
    <main className="screen no-nav">
      <AuthHeader title="ยินดีต้อนรับกลับมา" subtitle="เข้าสู่ระบบเพื่อดูผลและแนวโน้มของคุณ" />
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
      <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>
        ยังไม่มีบัญชี? <Link to="/register" style={{ fontWeight: 600 }}>สมัครใช้งาน</Link>
      </p>
    </main>
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
    <main className="screen no-nav">
      <AuthHeader title="เริ่มต้นดูแลใจ" subtitle="สร้างบัญชีเพื่อบันทึกผลและติดตามแนวโน้ม" />
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
        <div className="card tint-butter" style={{ boxShadow: 'none', fontSize: 14, lineHeight: 1.6, color: '#5C4510' }}>
          <strong style={{ fontFamily: 'var(--font-head)', fontWeight: 500 }}>ความเป็นส่วนตัวของคุณ (PDPA)</strong>
          <p style={{ margin: '4px 0 10px' }}>
            เราเก็บคำตอบ ผลการประเมิน และบันทึกอารมณ์ของคุณ เพื่อแสดงผลและแนวโน้มให้คุณเท่านั้น
            ไม่เปิดเผยต่อบุคคลอื่น คุณดาวน์โหลดหรือลบข้อมูลทั้งหมดได้ทุกเมื่อจากหน้าโปรไฟล์
          </p>
          <label className="row" style={{ gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
            <input type="checkbox" className="switch" checked={consent} onChange={(e) => setConsent(e.target.checked)} required style={{ marginTop: 2 }} />
            <span>ฉันยินยอมให้เก็บและใช้ข้อมูลสุขภาพตามที่ระบุข้างต้น</span>
          </label>
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy || !consent}>{busy ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชี'}</button>
      </form>
      <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>
        มีบัญชีอยู่แล้ว? <Link to="/login" style={{ fontWeight: 600 }}>เข้าสู่ระบบ</Link>
      </p>
    </main>
  );
}

import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth.tsx';
import { Icon } from '../components/Icon.tsx';
import { AssessmentIcon } from '../components/ui.tsx';
import { ASSESSMENTS } from '../../../shared/assessments.ts';
import { adminApi, useAdminData } from './adminApi.ts';
import { AdminState } from './AdminLayout.tsx';

function ReadOnlyNote() {
  return <div className="a-note"><Icon name="lock" size={16} />บัญชีผู้วิเคราะห์ข้อมูล (analyst) ดูได้อย่างเดียว การแก้ไขทำได้เฉพาะผู้ดูแลระบบ (admin)</div>;
}

export function AssessmentConfig() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [rev, setRev] = useState(0);
  const [msg, setMsg] = useState('');
  const s = useAdminData(() => adminApi.assessmentSettings(), String(rev));

  async function toggle(id: string, enabled: boolean) {
    setMsg('');
    try {
      await adminApi.setAssessmentEnabled(id, enabled);
      setRev((r) => r + 1);
      setMsg(enabled ? 'เปิดใช้แบบประเมินแล้ว' : 'ปิดใช้แบบประเมินแล้ว ผู้ใช้จะไม่เห็นแบบประเมินนี้');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="a-stackv">
      {!isAdmin && <ReadOnlyNote />}
      <div className="a-note">
        <Icon name="info" size={16} />
        หน้านี้เปิด/ปิดการให้บริการเท่านั้น ข้อคำถามและเกณฑ์การแปลผลแก้ไขได้ที่ไฟล์ shared/assessments.ts โดยผ่านการตรวจทานของทีมคลินิก
        ผลการประเมินเดิมไม่ถูกลบเมื่อปิดใช้
      </div>
      {msg && <div className="a-note" role="status">{msg}</div>}
      <AdminState error={s.error} loading={s.loading} hasData={!!s.data} />
      {s.data && (
        <section className="a-card" style={{ padding: 0 }}>
          <ul className="a-manage">
            {s.data.assessments.map((a) => {
              const meta = ASSESSMENTS.find((x) => x.id === a.id)!;
              return (
                <li key={a.id}>
                  <AssessmentIcon id={a.id} icon={meta.icon} size={42} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b>{a.name} ({a.code})</b>
                    <span className="a-muted small" style={{ display: 'block' }}>{a.items} ข้อ · ~{a.minutes} นาที · {a.source}</span>
                  </span>
                  <span className={`chip ${a.status === 'standard' ? 'level-good' : 'level-mild'}`}>{a.status === 'standard' ? 'มาตรฐาน' : 'ฉบับทดลอง'}</span>
                  <label className="a-switch">
                    <input type="checkbox" checked={a.enabled} disabled={!isAdmin} onChange={(e) => toggle(a.id, e.target.checked)} />
                    <span>{a.enabled ? 'เปิดใช้' : 'ปิดอยู่'}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export function Roles() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [rev, setRev] = useState(0);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'analyst' | 'admin' | 'user'>('analyst');
  const [msg, setMsg] = useState('');
  const r = useAdminData(() => (isAdmin ? adminApi.roles() : Promise.resolve({ staff: [] })), `${rev}|${isAdmin}`);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await adminApi.setRole(email, role);
      setMsg(`ตั้งสิทธิ์ ${email} เป็น ${role} แล้ว`);
      setEmail('');
      setRev((x) => x + 1);
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  if (!isAdmin) return <div className="a-stackv"><ReadOnlyNote /></div>;

  return (
    <div className="a-stackv">
      <div className="a-note">
        <Icon name="shield" size={16} />
        <span>
          <b>admin</b> ดูแดชบอร์ด ส่งออกรายงาน และแก้ไขการตั้งค่าได้ · <b>analyst</b> ดูแดชบอร์ดและส่งออกรายงานได้อย่างเดียว ·
          ทั้งสองบทบาทเห็นเฉพาะข้อมูลรวม ไม่เห็นคำตอบหรือผลรายบุคคล · หน้านี้แสดงเฉพาะบัญชีที่มีสิทธิ์พิเศษ ไม่แสดงรายชื่อผู้ใช้ทั่วไป
        </span>
      </div>

      <section className="a-card">
        <div className="a-card-head"><h2>กำหนดสิทธิ์</h2></div>
        <form className="a-form" onSubmit={submit}>
          <label>อีเมลของบัญชี (ต้องสมัครสมาชิกแล้ว)
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </label>
          <label>บทบาท
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              <option value="analyst">analyst (ดูอย่างเดียว)</option>
              <option value="admin">admin</option>
              <option value="user">user (ถอนสิทธิ์)</option>
            </select>
          </label>
          <button className="btn btn-primary" style={{ minHeight: 46, fontSize: 15 }}>บันทึก</button>
        </form>
        {msg && <p className="small" role="status" style={{ margin: '10px 0 0' }}>{msg}</p>}
      </section>

      <section className="a-card">
        <div className="a-card-head"><h2>บัญชีที่มีสิทธิ์</h2></div>
        <AdminState error={r.error} loading={r.loading} hasData={!!r.data} />
        {r.data && (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead><tr><th scope="col">ชื่อที่ใช้แสดง</th><th scope="col">อีเมล</th><th scope="col">บทบาท</th></tr></thead>
              <tbody>{r.data.staff.map((s) => <tr key={s.email}><td>{s.displayName}</td><td>{s.email}</td><td>{s.role}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [rev, setRev] = useState(0);
  const [value, setValue] = useState<number | ''>('');
  const [msg, setMsg] = useState('');
  const s = useAdminData(() => adminApi.settings(), String(rev));
  const current = s.data?.minGroupSize;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (value === '') return;
    setMsg('');
    try {
      await adminApi.setSettings(value);
      setMsg('บันทึกแล้ว');
      setRev((r) => r + 1);
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  return (
    <div className="a-stackv">
      {!isAdmin && <ReadOnlyNote />}
      <section className="a-card">
        <div className="a-card-head"><h2>การปกป้องกลุ่มย่อยขนาดเล็ก</h2></div>
        <p className="small" style={{ marginTop: 0 }}>
          ตัวเลขที่มีค่า 1 ถึง (ค่านี้ − 1) จะแสดงเป็น “&lt;ค่านี้” ทั้งบนแดชบอร์ดและในรายงาน เพื่อไม่ให้ระบุตัวบุคคลจากกลุ่มเล็กได้ ค่าต่ำสุดคือ 5
        </p>
        <form className="a-form" onSubmit={save}>
          <label>ขนาดกลุ่มขั้นต่ำ (ปัจจุบัน {current ?? '…'})
            <input type="number" min={5} max={50} required disabled={!isAdmin} value={value} placeholder={String(current ?? 5)}
              onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))} />
          </label>
          <button className="btn btn-primary" style={{ minHeight: 46, fontSize: 15 }} disabled={!isAdmin}>บันทึก</button>
        </form>
        {msg && <p className="small" role="status" style={{ margin: '10px 0 0' }}>{msg}</p>}
      </section>

      <section className="a-card">
        <div className="a-card-head"><h2>การเก็บข้อมูลเพื่อการวิเคราะห์</h2></div>
        <ul className="small" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>การเข้าใช้งาน: บันทึกเมื่อล็อกอิน และเมื่อเปิดแอปห่างจากครั้งก่อนอย่างน้อย 30 นาที เก็บเพียงประเภทอุปกรณ์ ไม่เก็บ IP หรือ User-Agent เต็ม</li>
          <li>การเริ่มทำแบบประเมิน: บันทึกเมื่อเปิดหน้าทำแบบประเมิน ไม่เก็บคำตอบระหว่างทำ (คำตอบระหว่างทำอยู่ในเครื่องผู้ใช้)</li>
          <li>เมื่อผู้ใช้ลบผลหรือลบบัญชี ข้อมูลของผู้ใช้นั้นถูกลบออกจากสถิติด้วย ตัวเลขย้อนหลังจึงอาจลดลงได้</li>
          <li>ผู้ดูแลระบบคนแรกกำหนดผ่านตัวแปร ADMIN_EMAILS หรือคำสั่ง <code>node src/cli.ts set-role</code> บนเซิร์ฟเวอร์</li>
        </ul>
      </section>
    </div>
  );
}

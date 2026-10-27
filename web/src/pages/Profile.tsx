import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Sex } from '../../../shared/assessments.ts';
import { api, thaiDate } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Avatar, DEFAULT_AVATAR, type AvatarConfig } from '../components/Avatar.tsx';
import { Icon } from '../components/Icon.tsx';
import { clearAllDrafts } from './Questionnaire.tsx';

type Part = 'skin' | 'hair' | 'hairColor' | 'outfit';

const PARTS: { id: Part; label: string; swatch: boolean; options: [string, string][] }[] = [
  { id: 'skin', label: 'สีผิว', swatch: true, options: [['#FBE0C8', 'ขาวอมชมพู'], ['#F5C9A6', 'น้ำผึ้งอ่อน'], ['#D9A27A', 'แทน'], ['#A86E4C', 'คล้ำ']] },
  { id: 'hair', label: 'ทรงผม', swatch: false, options: [['short', 'สั้น'], ['bob', 'บ๊อบ'], ['bun', 'มวยผม'], ['curly', 'หยิก']] },
  { id: 'hairColor', label: 'สีผม', swatch: true, options: [['#2B2220', 'ดำ'], ['#4A3228', 'น้ำตาลเข้ม'], ['#B9774A', 'น้ำตาลทอง'], ['#8C7AC8', 'ลาเวนเดอร์']] },
  { id: 'outfit', label: 'ชุด', swatch: false, options: [['hoodie', 'ฮู้ดดี้'], ['sweater', 'สเวตเตอร์'], ['scrubs', 'ชุดสครับ']] }
];

export function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isWelcome = params.get('welcome') === '1';

  const [avatar, setAvatar] = useState<AvatarConfig>(user?.avatar ?? DEFAULT_AVATAR);
  const [part, setPart] = useState<Part>('skin');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!user) return null;
  const dirty = JSON.stringify(avatar) !== JSON.stringify(user.avatar);
  const current = PARTS.find((p) => p.id === part)!;

  async function save(patch: Parameters<typeof api.updateProfile>[0], note: string) {
    setSaving(true);
    setMessage('');
    try {
      const { user: updated } = await api.updateProfile(patch);
      setUser(updated);
      setMessage(note);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    await api.deleteAccount();
    clearAllDrafts();
    setUser(null);
    navigate('/', { replace: true });
  }

  return (
    <main className="screen" style={{ gap: 12 }}>
      <h1 className="h1">โปรไฟล์</h1>

      {isWelcome && (
        <div className="alert tint-mint" style={{ color: '#2F5A48' }}>
          ยินดีต้อนรับ! แต่งเพื่อนคู่ใจให้เป็นแบบที่คุณชอบ แล้ว <Link to="/home">ไปที่หน้าหลัก</Link>
        </div>
      )}

      <section className="card tint-peach row" style={{ boxShadow: 'none', borderRadius: 28, gap: 14 }}>
        <Avatar config={avatar} size={112} bg="#fff" label="อวตารของคุณ" />
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 20 }}>คุณ{user.displayName}</div>
          <div className="small" style={{ color: '#6B4A3C' }}>สมาชิกตั้งแต่ {thaiDate(user.createdAt)}</div>
          <div className="caption" style={{ color: '#6B4A3C', wordBreak: 'break-all' }}>{user.email}</div>
        </div>
      </section>

      <section className="card" aria-labelledby="custom-h">
        <h2 id="custom-h" className="h2" style={{ fontSize: 16, marginBottom: 10 }}>แต่งตัวให้เพื่อนคู่ใจ</h2>
        <div className="segmented" role="tablist" aria-label="ส่วนที่ปรับแต่ง">
          {PARTS.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={part === p.id} onClick={() => setPart(p.id)} style={{ fontSize: 13 }}>{p.label}</button>
          ))}
        </div>
        <div role="tabpanel" className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {current.options.map(([value, label]) => {
            const on = avatar[part] === value;
            return (
              <button key={value} type="button" aria-pressed={on} onClick={() => setAvatar({ ...avatar, [part]: value })}
                className="row"
                style={{ gap: 8, minHeight: 44, padding: current.swatch ? '0 14px 0 6px' : '0 16px', borderRadius: 999, border: `2px solid ${on ? 'var(--lav-600)' : 'var(--line)'}`, background: on ? 'var(--lav-50)' : '#fff', fontSize: 14, cursor: 'pointer' }}>
                {current.swatch && <span style={{ width: 28, height: 28, borderRadius: '50%', background: value, border: '2px solid var(--ink)' }} />}
                {label}
              </button>
            );
          })}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="row grow small" style={{ justifyContent: 'space-between', minHeight: 44, cursor: 'pointer' }}>
            ใส่แว่นตา
            <input type="checkbox" className="switch" checked={avatar.glasses} onChange={(e) => setAvatar({ ...avatar, glasses: e.target.checked })} />
          </label>
          <button type="button" className="btn btn-primary" style={{ minHeight: 44, fontSize: 15 }} disabled={!dirty || saving}
            onClick={() => save({ avatar }, 'บันทึกอวตารแล้ว')}>
            บันทึกอวตาร
          </button>
        </div>
      </section>

      {message && <div className="alert tint-lav" role="status">{message}</div>}

      <section className="card" aria-label="ข้อมูลส่วนตัวและการตั้งค่า" style={{ padding: '4px 14px' }}>
        <label className="settings-row">
          <span className="icon-tile tint-butter ink-butter" style={{ width: 36, height: 36, borderRadius: 12 }}><Icon name="user" size={18} /></span>
          <span className="grow" style={{ fontSize: 15 }}>เพศกำเนิด<span className="caption muted" style={{ display: 'block' }}>ใช้เลือกเกณฑ์ของแบบประเมิน AUDIT-C</span></span>
          <select value={user.sex ?? ''} onChange={(e) => save({ sex: (e.target.value || null) as Sex | null }, 'บันทึกข้อมูลแล้ว')}
            style={{ minHeight: 40, borderRadius: 12, border: '1px solid var(--line)', background: '#fff', padding: '0 8px' }}>
            <option value="">ไม่ระบุ</option>
            <option value="male">ชาย</option>
            <option value="female">หญิง</option>
          </select>
        </label>
        <label className="settings-row">
          <span className="icon-tile tint-lav ink-lav" style={{ width: 36, height: 36, borderRadius: 12 }}><Icon name="bell" size={18} /></span>
          <span className="grow"><span style={{ display: 'block', fontSize: 15 }}>เตือนบันทึกอารมณ์</span><span className="caption muted">เก็บค่าที่ตั้งไว้ · ระบบแจ้งเตือนจะเปิดใช้ในเวอร์ชันถัดไป</span></span>
          <input type="checkbox" className="switch" checked={user.notifyMood} onChange={(e) => save({ notifyMood: e.target.checked }, 'บันทึกการตั้งค่าแล้ว')} />
        </label>
      </section>

      <section className="card" aria-labelledby="pdpa-h" style={{ padding: '14px 14px 4px' }}>
        <h2 id="pdpa-h" className="h2 row" style={{ fontSize: 16, gap: 8 }}><span className="ink-mint"><Icon name="shield" /></span>ความเป็นส่วนตัวและข้อมูล (PDPA)</h2>
        <p className="caption muted" style={{ margin: '6px 0 0' }}>ให้ความยินยอมเมื่อ {thaiDate(user.consentAt)} · ข้อมูลของคุณใช้เพื่อแสดงผลให้คุณเท่านั้น</p>
        <a className="settings-row" href="/api/me/export" download="mindease-data.json">
          <span className="icon-tile tint-mint ink-mint" style={{ width: 36, height: 36, borderRadius: 12 }}><Icon name="download" size={18} /></span>
          <span className="grow" style={{ fontSize: 15 }}>ดาวน์โหลดข้อมูลของฉัน (JSON)</span>
        </a>
        {!confirmDelete ? (
          <button type="button" className="settings-row" onClick={() => setConfirmDelete(true)}>
            <span className="icon-tile level-severe" style={{ width: 36, height: 36, borderRadius: 12 }}><Icon name="trash" size={18} /></span>
            <span className="grow" style={{ fontSize: 15, color: 'var(--rose-700)' }}>ลบบัญชีและข้อมูลทั้งหมด</span>
          </button>
        ) : (
          <div className="alert alert-error" style={{ margin: '8px 0 12px' }}>
            ลบบัญชี ผลการประเมิน และบันทึกอารมณ์ทั้งหมดอย่างถาวร กู้คืนไม่ได้
            <div className="row" style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-secondary" style={{ minHeight: 44, flex: 1 }} onClick={() => setConfirmDelete(false)}>ยกเลิก</button>
              <button type="button" className="btn btn-danger" style={{ minHeight: 44, flex: 1 }} onClick={deleteAccount}>ยืนยันลบ</button>
            </div>
          </div>
        )}
      </section>

      <button type="button" className="btn btn-secondary btn-block" onClick={async () => { await logout(); navigate('/', { replace: true }); }}>
        <Icon name="logout" size={18} />ออกจากระบบ
      </button>
    </main>
  );
}

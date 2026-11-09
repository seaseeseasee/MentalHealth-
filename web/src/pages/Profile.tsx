import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Sex } from '../../../shared/assessments.ts';
import { api, isStaff, thaiDate, useLiveData, type Stats } from '../api.ts';
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
  const [stats, setStats] = useState<Stats | null>(null);

  useLiveData(() => {
    api.stats().then(setStats).catch(() => undefined);
  });

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

  const roleLabel = user.role === 'admin' ? 'ผู้ดูแลระบบ' : user.role === 'analyst' ? 'ผู้วิเคราะห์ข้อมูล' : null;

  return (
    <main className="screen wide profile">
      <h1 className="h1">โปรไฟล์</h1>

      {isWelcome && (
        <div className="note-info" style={{ fontSize: 14.5 }}>
          <Icon name="heart" size={18} />
          <span>ยินดีต้อนรับ! แต่งเพื่อนคู่ใจให้เป็นแบบที่คุณชอบ แล้ว <Link to="/home" style={{ fontWeight: 600 }}>ไปที่หน้าหลัก</Link></span>
        </div>
      )}

      <div className="profile-grid">
        <aside className="profile-side">
          <section className="profile-card">
            <div className="profile-avatar"><Avatar config={avatar} size={128} bg="#fff" label="อวตารของคุณ" /></div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, color: 'var(--heading)', marginTop: 10 }}>คุณ{user.displayName}</div>
            <div className="small muted" style={{ wordBreak: 'break-all' }}>{user.email}</div>
            {roleLabel && <span className="chip" style={{ marginTop: 8, background: 'var(--lav-600)', color: '#fff' }}>{roleLabel}</span>}
            <div className="profile-stats">
              <div><b>{stats?.totalResults ?? '–'}</b><span>ครั้งที่ประเมิน</span></div>
              <div><b>{stats?.streak ?? '–'}</b><span>วันบันทึกต่อเนื่อง</span></div>
              <div><b>{thaiDate(user.createdAt, false)}</b><span>สมาชิกตั้งแต่ {new Date(user.createdAt).getFullYear() + 543}</span></div>
            </div>
            {isStaff(user) && (
              <Link to="/admin" className="btn btn-primary btn-block" style={{ minHeight: 46, fontSize: 15, marginTop: 14 }}>
                <Icon name="chart" size={18} />แดชบอร์ดผู้ดูแลระบบ
              </Link>
            )}
          </section>
          <button type="button" className="btn btn-secondary btn-block hide-sm" onClick={async () => { await logout(); navigate('/', { replace: true }); }}>
            <Icon name="logout" size={18} />ออกจากระบบ
          </button>
        </aside>

        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          <section className="card" aria-labelledby="custom-h">
            <div className="row" style={{ marginBottom: 12 }}>
              <span className="icon-circle" style={{ width: 38, height: 38, background: '#D04F7B' }}><Icon name="star" size={18} /></span>
              <div className="grow">
                <h2 id="custom-h" className="h2">แต่งตัวให้เพื่อนคู่ใจ</h2>
                <div className="caption muted">ดูตัวอย่างได้ทันทีที่การ์ดโปรไฟล์ กดบันทึกเมื่อพอใจ</div>
              </div>
            </div>
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
                    {current.swatch && <span style={{ width: 28, height: 28, borderRadius: '50%', background: value, border: '2px solid #fff', boxShadow: '0 0 0 1px var(--line)' }} />}
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <label className="row grow small" style={{ justifyContent: 'space-between', minHeight: 44, cursor: 'pointer', minWidth: 160 }}>
                ใส่แว่นตา
                <input type="checkbox" className="switch" checked={avatar.glasses} onChange={(e) => setAvatar({ ...avatar, glasses: e.target.checked })} />
              </label>
              <button type="button" className="btn btn-primary" style={{ minHeight: 44, fontSize: 15 }} disabled={!dirty || saving}
                onClick={() => save({ avatar }, 'บันทึกอวตารแล้ว')}>
                บันทึกอวตาร
              </button>
            </div>
          </section>

          {message && <div className="note-info" role="status"><Icon name="check" size={18} />{message}</div>}

          <section className="card" aria-labelledby="settings-h" style={{ padding: '14px 16px 4px' }}>
            <h2 id="settings-h" className="h2" style={{ marginBottom: 4 }}>การตั้งค่า</h2>
            <label className="settings-row">
              <span className="icon-circle" style={{ width: 38, height: 38, background: '#B98600' }}><Icon name="user" size={18} /></span>
              <span className="grow" style={{ fontSize: 15 }}>เพศกำเนิด<span className="caption muted" style={{ display: 'block' }}>ใช้เลือกเกณฑ์ของแบบประเมิน AUDIT-C</span></span>
              <select value={user.sex ?? ''} onChange={(e) => save({ sex: (e.target.value || null) as Sex | null }, 'บันทึกข้อมูลแล้ว')}
                style={{ minHeight: 42, borderRadius: 12, border: '1px solid var(--line)', background: '#fff', padding: '0 10px' }}>
                <option value="">ไม่ระบุ</option>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
              </select>
            </label>
            <label className="settings-row">
              <span className="icon-circle" style={{ width: 38, height: 38, background: '#7A58D6' }}><Icon name="bell" size={18} /></span>
              <span className="grow"><span style={{ display: 'block', fontSize: 15 }}>เตือนบันทึกอารมณ์</span><span className="caption muted">เก็บค่าที่ตั้งไว้ · ระบบแจ้งเตือนจะเปิดใช้ในเวอร์ชันถัดไป</span></span>
              <input type="checkbox" className="switch" checked={user.notifyMood} onChange={(e) => save({ notifyMood: e.target.checked }, 'บันทึกการตั้งค่าแล้ว')} />
            </label>
          </section>

          <section className="card" aria-labelledby="pdpa-h" style={{ padding: '14px 16px 4px' }}>
            <h2 id="pdpa-h" className="h2 row" style={{ gap: 8 }}><span style={{ color: '#2E9E62', display: 'flex' }}><Icon name="shield" /></span>ความเป็นส่วนตัวและข้อมูล (PDPA)</h2>
            <p className="caption muted" style={{ margin: '6px 0 0', fontSize: 13 }}>ให้ความยินยอมเมื่อ {thaiDate(user.consentAt)} · ผลรายบุคคลแสดงให้คุณเท่านั้น ผู้ดูแลระบบเห็นเฉพาะสถิติภาพรวมที่ไม่ระบุตัวบุคคล</p>
            <a className="settings-row" href="/api/me/export" download="mindease-data.json">
              <span className="icon-circle" style={{ width: 38, height: 38, background: '#2E9E62' }}><Icon name="download" size={18} /></span>
              <span className="grow" style={{ fontSize: 15 }}>ดาวน์โหลดข้อมูลของฉัน (JSON)</span>
              <Icon name="next" size={16} />
            </a>
            {!confirmDelete ? (
              <button type="button" className="settings-row" onClick={() => setConfirmDelete(true)}>
                <span className="icon-circle" style={{ width: 38, height: 38, background: 'var(--rose-50)', color: 'var(--rose-700)' }}><Icon name="trash" size={18} /></span>
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

          <button type="button" className="btn btn-secondary btn-block show-sm" onClick={async () => { await logout(); navigate('/', { replace: true }); }}>
            <Icon name="logout" size={18} />ออกจากระบบ
          </button>
        </div>
      </div>
    </main>
  );
}

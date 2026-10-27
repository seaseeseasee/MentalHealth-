import { useEffect, useState } from 'react';
import { useAuth } from '../auth.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { Icon } from '../components/Icon.tsx';
import { HelpLineCard } from '../components/ui.tsx';

type Cat = 'breath' | 'mind' | 'sleep';

const PHASES = [
  { label: 'หายใจเข้าทางจมูก', secs: 4, scale: 1 },
  { label: 'กลั้นหายใจไว้', secs: 7, scale: 1 },
  { label: 'ผ่อนลมออกทางปาก', secs: 8, scale: 0.72 }
];
const CYCLES = 4;

const ACTIVITIES: { cat: Cat; title: string; meta: string; icon: string; tint: string; steps: string[] }[] = [
  { cat: 'breath', title: 'หายใจแบบกล่อง', meta: 'หายใจ · 2 นาที', icon: 'wind', tint: 'tint-peach ink-peach', steps: ['หายใจเข้าช้าๆ นับ 1–4', 'กลั้นไว้ นับ 1–4', 'ผ่อนออกช้าๆ นับ 1–4', 'ค้างไว้ นับ 1–4 แล้วทำซ้ำ 6 รอบ'] },
  { cat: 'mind', title: 'สแกนร่างกาย', meta: 'สมาธิ · 5 นาที', icon: 'body', tint: 'tint-mint ink-mint', steps: ['นั่งหรือนอนในท่าสบาย หลับตา', 'ค่อยๆ เลื่อนความสนใจจากปลายเท้าขึ้นมาถึงศีรษะ', 'สังเกตจุดที่ตึง แล้วหายใจออกพร้อมผ่อนคลายจุดนั้น', 'ไม่ต้องเปลี่ยนอะไร แค่รับรู้'] },
  { cat: 'mind', title: 'เขียนขอบคุณ 3 สิ่ง', meta: 'สมาธิ · 3 นาที', icon: 'pen', tint: 'tint-butter ink-butter', steps: ['นึกถึงเรื่องดีๆ เล็กๆ ที่เกิดขึ้นวันนี้ 3 เรื่อง', 'เขียนว่าเพราะอะไรเรื่องนั้นถึงดี', 'ทำต่อเนื่อง 1 สัปดาห์แล้วสังเกตความรู้สึก'] },
  { cat: 'sleep', title: 'เตรียมตัวก่อนนอน', meta: 'การนอน · 10 นาที', icon: 'moon', tint: 'tint-lav ink-lav', steps: ['ปิดหน้าจอก่อนนอน 30 นาที', 'หรี่ไฟและทำห้องให้เย็นสบาย', 'จดเรื่องที่ค้างในใจลงกระดาษ แล้ววางไว้ก่อน', 'หายใจ 4-7-8 สัก 4 รอบ'] },
  { cat: 'sleep', title: 'ยืดเหยียดคลายเครียด', meta: 'การนอน · 7 นาที', icon: 'walk', tint: 'tint-mint ink-mint', steps: ['หมุนไหล่ไปข้างหลังช้าๆ 10 รอบ', 'เอียงคอซ้าย–ขวา ข้างละ 15 วินาที', 'ก้มแตะปลายเท้าเท่าที่ไหว ค้างไว้ 20 วินาที', 'หายใจยาวๆ ทุกท่า'] }
];

const ARTICLES = [
  { title: 'รู้จักภาวะหมดไฟ และวิธีเติมพลังให้ตัวเอง', mins: 4, icon: 'battery', tint: 'tint-peach ink-peach',
    body: ['ภาวะหมดไฟ (Burnout) เกิดจากความเครียดจากงานที่สะสมเป็นเวลานาน มักมีอาการ 3 อย่าง คือ เหนื่อยล้าทางอารมณ์ รู้สึกเฉยชาหรือห่างเหินกับงาน และรู้สึกว่าตัวเองทำงานได้ไม่ดีเหมือนเคย',
      'การเติมพลังเริ่มได้จากการแยกเวลางานกับเวลาส่วนตัวให้ชัด พักสั้นๆ ระหว่างวัน คุยกับหัวหน้าเรื่องภาระงานที่มากเกินไป และหาสิ่งที่ทำให้รู้สึกมีความหมายนอกเหนือจากงาน',
      'หากรู้สึกหมดแรงจนกระทบการนอน การกิน หรือความสัมพันธ์ ควรปรึกษาผู้เชี่ยวชาญ'] },
  { title: 'นอนไม่หลับเพราะคิดมาก ทำอย่างไรดี', mins: 5, icon: 'moon', tint: 'tint-lav ink-lav',
    body: ['ความคิดที่วนเวียนตอนกลางคืนเป็นเรื่องที่พบได้บ่อย โดยเฉพาะช่วงที่มีความเครียด',
      'ลองกำหนด “เวลากังวล” 15 นาทีช่วงหัวค่ำ เขียนเรื่องที่กังวลและสิ่งที่จะทำต่อไว้บนกระดาษ เมื่อเข้านอนแล้วคิดขึ้นมาอีก ให้บอกตัวเองว่าได้จดไว้แล้ว',
      'ถ้านอนไม่หลับเกิน 20 นาที ให้ลุกไปทำกิจกรรมเบาๆ ในแสงสลัว แล้วค่อยกลับมานอนเมื่อง่วง ตื่นเวลาเดิมทุกวันแม้จะนอนน้อย'] },
  { title: 'วิธีรับฟังเพื่อนที่กำลังไม่สบายใจ', mins: 3, icon: 'chat', tint: 'tint-mint ink-mint',
    body: ['ฟังโดยไม่รีบแนะนำหรือตัดสิน ให้เขาได้เล่าจนจบ สะท้อนความรู้สึกที่ได้ยิน เช่น “ฟังดูเหนื่อยมากเลยนะ”',
      'ถามว่าเขาอยากให้ช่วยอะไร มากกว่าเดาเอง และถ้าเขาพูดถึงการทำร้ายตัวเอง ให้ถามตรงๆ อย่างอ่อนโยน และพาไปหาความช่วยเหลือ เช่น สายด่วน 1323'] }
];

function BreathingCard() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  // step indexes across all phases of all cycles; left is the countdown for that phase.
  const [{ step, left }, setTimer] = useState({ step: 0, left: PHASES[0].secs });

  const phase = PHASES[step % PHASES.length];
  const cycle = Math.floor(step / PHASES.length) + 1;
  const finished = step >= PHASES.length * CYCLES;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setTimer((s) => {
        if (s.left > 1) return { ...s, left: s.left - 1 };
        const next = s.step + 1;
        return { step: next, left: PHASES[next % PHASES.length].secs };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (finished) {
      setRunning(false);
      setTimer({ step: 0, left: PHASES[0].secs });
    }
  }, [finished]);

  function toggle() {
    setTimer({ step: 0, left: PHASES[0].secs });
    setRunning((r) => !r);
  }

  const scale = running ? phase.scale : 0.72;
  return (
    <section className="card tint-lav row" style={{ boxShadow: 'none', borderRadius: 28, padding: 18, alignItems: 'center' }}>
      <div className="grow">
        <span className="chip ink-lav" style={{ background: '#fff', fontSize: 12 }}>แนะนำสำหรับคุณ</span>
        <h2 style={{ fontSize: 20, margin: '10px 0 2px' }}>ฝึกหายใจ 4-7-8</h2>
        <p className="small" style={{ color: '#4F4470', margin: '0 0 12px', lineHeight: 1.5 }} aria-live="polite">
          {running ? `รอบ ${cycle}/${CYCLES} · ${phase.label} ${left} วินาที` : 'ช่วยให้ใจสงบลงก่อนนอน · ประมาณ 1 นาที'}
        </p>
        <button type="button" className="btn btn-primary" style={{ minHeight: 44, fontSize: 15 }} aria-pressed={running} onClick={toggle}>
          <Icon name={running ? 'pause' : 'play'} size={18} />{running ? 'หยุด' : 'เริ่มเลย'}
        </button>
      </div>
      <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px dashed var(--lav-200)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: 'var(--lav-200)', opacity: 0.7, transform: `scale(${scale})`, transition: `transform ${running ? phase.secs : 0.4}s ease-in-out` }} />
        <div style={{ position: 'relative' }}><Avatar config={user?.avatar} mood="calm" size={78} bg="#fff" /></div>
      </div>
    </section>
  );
}

export function SelfCare() {
  const [cat, setCat] = useState<Cat | 'all'>('all');
  const filters: { id: Cat | 'all'; label: string }[] = [
    { id: 'all', label: 'ทั้งหมด' }, { id: 'breath', label: 'หายใจ' }, { id: 'mind', label: 'สมาธิ' }, { id: 'sleep', label: 'การนอน' }
  ];

  return (
    <main className="screen">
      <header>
        <h1 className="h1">ดูแลใจวันนี้</h1>
        <p className="small muted" style={{ margin: '2px 0 0' }}>กิจกรรมสั้นๆ ที่ทำได้ทุกที่</p>
      </header>

      <BreathingCard />

      <div className="filter-row" role="group" aria-label="หมวดกิจกรรม">
        {filters.map((f) => (
          <button key={f.id} type="button" className="filter" aria-pressed={cat === f.id} onClick={() => setCat(f.id)}>{f.label}</button>
        ))}
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {ACTIVITIES.filter((a) => cat === 'all' || a.cat === cat).map((a) => (
          <details key={a.title} className="card" style={{ padding: '12px 14px', boxShadow: 'none' }}>
            <summary className="row" style={{ cursor: 'pointer', listStyle: 'none' }}>
              <span className={`icon-tile ${a.tint}`}><Icon name={a.icon} /></span>
              <span className="grow">
                <span style={{ display: 'block', fontFamily: 'var(--font-head)', fontSize: 15 }}>{a.title}</span>
                <span className="caption muted">{a.meta}</span>
              </span>
              <Icon name="next" size={18} />
            </summary>
            <ol style={{ margin: '10px 0 0', paddingLeft: 22, fontSize: 14, lineHeight: 1.7 }}>
              {a.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </details>
        ))}
      </div>

      <section>
        <h2 className="h2" style={{ fontSize: 16, marginBottom: 8 }}>บทความน่าอ่าน</h2>
        <div className="stack">
          {ARTICLES.map((ar) => (
            <details key={ar.title} className="card" style={{ padding: 10, boxShadow: 'none' }}>
              <summary className="row" style={{ cursor: 'pointer', listStyle: 'none' }}>
                <span className={`icon-tile ${ar.tint}`} style={{ width: 56, height: 56 }}><Icon name={ar.icon} size={30} strokeWidth={1.8} /></span>
                <span className="grow">
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 500, lineHeight: 1.45 }}>{ar.title}</span>
                  <span className="caption muted">อ่าน {ar.mins} นาที</span>
                </span>
              </summary>
              <div style={{ padding: '8px 6px 4px', fontSize: 15, lineHeight: 1.7 }}>
                {ar.body.map((p) => <p key={p} style={{ margin: '0 0 10px' }}>{p}</p>)}
              </div>
            </details>
          ))}
        </div>
      </section>

      <HelpLineCard />
    </main>
  );
}

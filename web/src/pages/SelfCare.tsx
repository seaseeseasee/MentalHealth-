import { useEffect, useState } from 'react';
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
  { cat: 'breath', title: 'หายใจแบบกล่อง', meta: 'หายใจ · 2 นาที', icon: 'wind', tint: '#E26A1B', steps: ['หายใจเข้าช้าๆ นับ 1–4', 'กลั้นไว้ นับ 1–4', 'ผ่อนออกช้าๆ นับ 1–4', 'ค้างไว้ นับ 1–4 แล้วทำซ้ำ 6 รอบ'] },
  { cat: 'mind', title: 'สแกนร่างกาย', meta: 'สมาธิ · 5 นาที', icon: 'body', tint: '#2E9E62', steps: ['นั่งหรือนอนในท่าสบาย หลับตา', 'ค่อยๆ เลื่อนความสนใจจากปลายเท้าขึ้นมาถึงศีรษะ', 'สังเกตจุดที่ตึง แล้วหายใจออกพร้อมผ่อนคลายจุดนั้น', 'ไม่ต้องเปลี่ยนอะไร แค่รับรู้'] },
  { cat: 'mind', title: 'เขียนขอบคุณ 3 สิ่ง', meta: 'สมาธิ · 3 นาที', icon: 'pen', tint: '#B98600', steps: ['นึกถึงเรื่องดีๆ เล็กๆ ที่เกิดขึ้นวันนี้ 3 เรื่อง', 'เขียนว่าเพราะอะไรเรื่องนั้นถึงดี', 'ทำต่อเนื่อง 1 สัปดาห์แล้วสังเกตความรู้สึก'] },
  { cat: 'sleep', title: 'เตรียมตัวก่อนนอน', meta: 'การนอน · 10 นาที', icon: 'moon', tint: '#7A58D6', steps: ['ปิดหน้าจอก่อนนอน 30 นาที', 'หรี่ไฟและทำห้องให้เย็นสบาย', 'จดเรื่องที่ค้างในใจลงกระดาษ แล้ววางไว้ก่อน', 'หายใจ 4-7-8 สัก 4 รอบ'] },
  { cat: 'sleep', title: 'ยืดเหยียดคลายเครียด', meta: 'การนอน · 7 นาที', icon: 'walk', tint: '#2E9E62', steps: ['หมุนไหล่ไปข้างหลังช้าๆ 10 รอบ', 'เอียงคอซ้าย–ขวา ข้างละ 15 วินาที', 'ก้มแตะปลายเท้าเท่าที่ไหว ค้างไว้ 20 วินาที', 'หายใจยาวๆ ทุกท่า'] }
];

const ARTICLES = [
  { title: 'รู้จักภาวะหมดไฟ และวิธีเติมพลังให้ตัวเอง', mins: 4, icon: 'battery', tint: '#E26A1B',
    body: ['ภาวะหมดไฟ (Burnout) เกิดจากความเครียดจากงานที่สะสมเป็นเวลานาน มักมีอาการ 3 อย่าง คือ เหนื่อยล้าทางอารมณ์ รู้สึกเฉยชาหรือห่างเหินกับงาน และรู้สึกว่าตัวเองทำงานได้ไม่ดีเหมือนเคย',
      'การเติมพลังเริ่มได้จากการแยกเวลางานกับเวลาส่วนตัวให้ชัด พักสั้นๆ ระหว่างวัน คุยกับหัวหน้าเรื่องภาระงานที่มากเกินไป และหาสิ่งที่ทำให้รู้สึกมีความหมายนอกเหนือจากงาน',
      'หากรู้สึกหมดแรงจนกระทบการนอน การกิน หรือความสัมพันธ์ ควรปรึกษาผู้เชี่ยวชาญ'] },
  { title: 'นอนไม่หลับเพราะคิดมาก ทำอย่างไรดี', mins: 5, icon: 'moon', tint: '#7A58D6',
    body: ['ความคิดที่วนเวียนตอนกลางคืนเป็นเรื่องที่พบได้บ่อย โดยเฉพาะช่วงที่มีความเครียด',
      'ลองกำหนด “เวลากังวล” 15 นาทีช่วงหัวค่ำ เขียนเรื่องที่กังวลและสิ่งที่จะทำต่อไว้บนกระดาษ เมื่อเข้านอนแล้วคิดขึ้นมาอีก ให้บอกตัวเองว่าได้จดไว้แล้ว',
      'ถ้านอนไม่หลับเกิน 20 นาที ให้ลุกไปทำกิจกรรมเบาๆ ในแสงสลัว แล้วค่อยกลับมานอนเมื่อง่วง ตื่นเวลาเดิมทุกวันแม้จะนอนน้อย'] },
  { title: 'วิธีรับฟังเพื่อนที่กำลังไม่สบายใจ', mins: 3, icon: 'chat', tint: '#2E9E62',
    body: ['ฟังโดยไม่รีบแนะนำหรือตัดสิน ให้เขาได้เล่าจนจบ สะท้อนความรู้สึกที่ได้ยิน เช่น “ฟังดูเหนื่อยมากเลยนะ”',
      'ถามว่าเขาอยากให้ช่วยอะไร มากกว่าเดาเอง และถ้าเขาพูดถึงการทำร้ายตัวเอง ให้ถามตรงๆ อย่างอ่อนโยน และพาไปหาความช่วยเหลือ เช่น สายด่วน 1323'] }
];

const CAT_LABEL: Record<Cat, string> = { breath: 'หายใจ', mind: 'สมาธิ', sleep: 'การนอน' };

function BreathingCard() {
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
    <section className="breath-card">
      <div className="grow" style={{ minWidth: 0 }}>
        <span className="chip" style={{ background: '#fff', color: 'var(--lav-600)', fontSize: 12 }}>แนะนำสำหรับคุณ</span>
        <h2 style={{ fontSize: 24, margin: '10px 0 4px' }}>ฝึกหายใจ 4-7-8</h2>
        <p className="small" style={{ color: 'var(--heading)', margin: '0 0 14px', lineHeight: 1.55 }} aria-live="polite">
          {running ? `รอบ ${cycle}/${CYCLES} · ${phase.label} ${left} วินาที` : 'ช่วยให้ใจสงบลง เหมาะก่อนนอน · ประมาณ 1 นาที'}
        </p>
        {running && (
          <div className="breath-steps" aria-hidden="true">
            {PHASES.map((p, i) => (
              <span key={p.label} className={i === step % PHASES.length ? 'on' : undefined}>{p.label} {p.secs}s</span>
            ))}
          </div>
        )}
        <button type="button" className="btn btn-primary" style={{ minHeight: 46, fontSize: 15 }} aria-pressed={running} onClick={toggle}>
          <Icon name={running ? 'pause' : 'play'} size={18} />{running ? 'หยุด' : 'เริ่มเลย'}
        </button>
      </div>
      <div className="breath-ring-wrap">
        <div className="breath-ring-dash" />
        <div aria-hidden="true" className="breath-ring-fill" style={{ transform: `scale(${scale})`, transition: `transform ${running ? phase.secs : 0.4}s ease-in-out` }} />
        <img src="/illustrations/plant.webp" alt="" width="300" height="408" className="breath-ring-img" />
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
    <main className="screen wide care">
      <header>
        <h1 className="h1">ดูแลใจวันนี้</h1>
        <p className="small muted" style={{ margin: '2px 0 0' }}>กิจกรรมสั้นๆ ที่ทำได้ทุกที่ และบทความที่ช่วยให้เข้าใจใจตัวเองมากขึ้น</p>
      </header>

      <BreathingCard />

      <section>
        <div className="section-head" style={{ marginBottom: 12 }}>
          <h2 className="h2" style={{ fontSize: 18, marginRight: 'auto' }}>กิจกรรมดูแลใจ</h2>
          <div className="seg" role="group" aria-label="หมวดกิจกรรม">
            {filters.map((f) => (
              <button key={f.id} type="button" aria-pressed={cat === f.id} onClick={() => setCat(f.id)}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="care-grid">
          {ACTIVITIES.filter((a) => cat === 'all' || a.cat === cat).map((a) => (
            <details key={a.title} className="care-item">
              <summary>
                <span className="icon-circle" style={{ background: a.tint }}><Icon name={a.icon} size={22} /></span>
                <span className="grow">
                  <span className="care-title">{a.title}</span>
                  <span className="caption muted">{a.meta}</span>
                </span>
                <span className="chip" style={{ background: 'var(--lav-50)', color: 'var(--lav-600)', fontSize: 12 }}>{CAT_LABEL[a.cat]}</span>
                <span className="care-chevron"><Icon name="next" size={18} /></span>
              </summary>
              <ol>
                {a.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </details>
          ))}
        </div>
      </section>

      <section>
        <h2 className="h2" style={{ fontSize: 18, marginBottom: 12 }}>บทความน่าอ่าน</h2>
        <div className="care-grid">
          {ARTICLES.map((ar) => (
            <details key={ar.title} className="care-item">
              <summary>
                <span className="icon-circle" style={{ width: 52, height: 52, borderRadius: 16, background: ar.tint }}><Icon name={ar.icon} size={26} /></span>
                <span className="grow">
                  <span className="care-title">{ar.title}</span>
                  <span className="caption muted"><Icon name="book" size={13} /> อ่าน {ar.mins} นาที</span>
                </span>
                <span className="care-chevron"><Icon name="next" size={18} /></span>
              </summary>
              <div className="care-body">
                {ar.body.map((p) => <p key={p}>{p}</p>)}
              </div>
            </details>
          ))}
        </div>
      </section>

      <HelpLineCard />
    </main>
  );
}

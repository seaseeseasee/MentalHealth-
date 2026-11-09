import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ASSESSMENTS, CATEGORIES, type CategoryId } from '../../../shared/assessments.ts';
import { Icon } from './Icon.tsx';
import { ACCENTS } from './ui.tsx';

const CAT_LABELS: Record<CategoryId, string> = { mood: 'อารมณ์', strength: 'จุดแข็งทางใจ', life: 'พฤติกรรม', work: 'สมอง/งาน' };

/** The landing-style assessment section: eyebrow, title, category filter and large cards. Shared by the landing and home pages. */
export function AssessmentCards({ disabled = [], eyebrow = 'เลือกแบบประเมินที่ตรงกับคุณ' }: { disabled?: string[]; eyebrow?: string }) {
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const available = ASSESSMENTS.filter((a) => !disabled.includes(a.id));
  const shown = available.filter((a) => cat === 'all' || a.category === cat);

  return (
    <>
      <span className="eyebrow"><span />{eyebrow}</span>
      <div className="section-head">
        <h2>แบบประเมินสุขภาพจิต {available.length} ประเภท</h2>
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
    </>
  );
}

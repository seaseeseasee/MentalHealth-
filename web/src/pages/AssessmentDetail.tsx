import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CATEGORIES, bandsFor, getAssessment, maxScore } from '../../../shared/assessments.ts';
import { api, useLiveData } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Icon } from '../components/Icon.tsx';
import { ACCENTS, BackButton, LEVEL_FILLS } from '../components/ui.tsx';
import { loadDraft } from './Questionnaire.tsx';

export function AssessmentDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [disabled, setDisabled] = useState(false);
  const a = getAssessment(id);

  useLiveData(() => {
    api.availability().then((r) => setDisabled(r.disabled.includes(id))).catch(() => undefined);
  }, [id]);

  if (!a) return <Navigate to="/assessments" replace />;

  const acc = ACCENTS[a.id];
  const category = CATEGORIES.find((c) => c.id === a.category)!;
  const draft = loadDraft(user?.id, a.id);
  const answered = draft ? draft.answers.filter((v) => v !== null).length : 0;
  const bands = bandsFor(a, a.bandsBySex ? (user?.sex ?? 'male') : null);
  const total = maxScore(a);

  const cta = disabled ? (
    <span className="btn btn-primary btn-lg btn-block" aria-disabled="true" style={{ background: '#C9D9F0', color: '#3E5375', boxShadow: 'none' }}>ปิดให้บริการชั่วคราว</span>
  ) : (
    <Link to={`/assessments/${a.id}/take`} className="btn btn-primary btn-lg btn-block">
      {answered > 0 ? `ทำต่อจากข้อ ${answered + 1}` : 'เริ่มทำแบบประเมิน'} <Icon name="arrow" strokeWidth={2.5} />
    </Link>
  );

  return (
    <main className="screen no-nav detail">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <BackButton to="/assessments" />
        <span className="chip" style={{ background: '#fff', border: '1px solid var(--line)', color: 'var(--heading)' }}>{category.label}</span>
      </div>

      <div className="detail-grid">
        <div className="stack" style={{ gap: 16, minWidth: 0 }}>
          <section className="detail-hero">
            <span className="tcard-blob" style={{ background: acc.tint, width: 220, height: 220, right: -60, top: -70 }} aria-hidden="true" />
            <div className="row" style={{ position: 'relative', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <span className="tcard-icon" style={{ width: 64, height: 64, borderRadius: 20, background: acc.c, boxShadow: `0 10px 22px ${acc.c}47` }}><Icon name={a.icon} size={32} /></span>
              <span className="tcard-code">{a.code}</span>
            </div>
            <h1 style={{ position: 'relative', fontSize: 26, margin: '14px 0 6px' }}>{a.name}</h1>
            <p style={{ position: 'relative', margin: 0, fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>{a.intro}</p>
            <div className="detail-stats">
              <div><Icon name="tests" size={18} /><b>{a.items.length} ข้อ</b><span>คำถาม</span></div>
              <div><Icon name="clock" size={18} /><b>~{a.minutes} นาที</b><span>เวลาโดยประมาณ</span></div>
              <div><Icon name="chart" size={18} /><b>0–{total}</b><span>{a.direction === 'higher-better' ? 'คะแนนสูง = ดี' : 'คะแนนต่ำ = ดี'}</span></div>
            </div>
            {answered > 0 && (
              <div className="note-tip" style={{ position: 'relative', marginTop: 14 }}>
                <Icon name="history" size={18} />คุณตอบไปแล้ว {answered} จาก {a.items.length} ข้อ ทำต่อจากเดิมได้เลย
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="h2" style={{ marginBottom: 6 }}>วิธีตอบ</h2>
            <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.65 }}><strong>{a.prompt}</strong> แล้วเลือกคำตอบที่ตรงกับตัวคุณมากที่สุด</p>
            {a.scale.length > 0 ? (
              <div className="detail-scale">
                {a.scale.map((o, i) => (
                  <div key={o.value}>
                    <span className="meter" aria-hidden="true">
                      {a.scale.map((_, j) => <span key={j} className={j <= i ? 'on' : undefined} style={{ height: 6 + j * (12 / Math.max(1, a.scale.length - 1)) }} />)}
                    </span>
                    {o.label}
                  </div>
                ))}
              </div>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>แต่ละข้อมีตัวเลือกเฉพาะของข้อนั้น</p>
            )}
          </section>

          <section className="card">
            <h2 className="h2" style={{ marginBottom: 4 }}>การแปลผล</h2>
            <p className="small muted" style={{ margin: '0 0 12px' }}>
              ช่วงคะแนนตามเกณฑ์ของแบบประเมินนี้{a.bandsBySex ? ` (แสดงเกณฑ์${user?.sex === 'female' ? 'เพศหญิง' : 'เพศชาย'} · ระบบจะใช้เกณฑ์ตามเพศที่คุณระบุ)` : ''}
            </p>
            <ul className="detail-bands">
              {bands.map((b) => (
                <li key={`${b.min}-${b.label}`}>
                  <span style={{ background: LEVEL_FILLS[b.level] }} />
                  <b>{b.min}–{b.max}</b>
                  <span>{b.label}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="detail-side">
          <section className="card stack" style={{ gap: 12 }}>
            <h2 className="h2">ก่อนเริ่ม อยากให้รู้ว่า</h2>
            <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 14, lineHeight: 1.55, gap: 10 }}>
              {['ไม่มีคำตอบถูกหรือผิด ตอบตามความรู้สึกจริงได้เลย', 'พักกลางคันได้ ระบบจะจำคำตอบไว้ในเครื่องนี้', 'ผลใช้คัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยโรค'].map((t) => (
                <li key={t} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <span className="icon-circle" style={{ width: 22, height: 22, background: '#2E9E62', marginTop: 1 }}><Icon name="check" size={13} strokeWidth={3} /></span>{t}
                </li>
              ))}
            </ul>
            {a.status === 'draft' && (
              <div className="alert" style={{ background: 'var(--butter-50)', color: '#5C4300' }}>
                <strong>แบบคัดกรองฉบับทดลอง</strong> · {a.source} เกณฑ์การแปลผลอยู่ระหว่างการตรวจสอบโดยผู้เชี่ยวชาญ
              </div>
            )}
            <div className="row small" style={{ gap: 8, alignItems: 'flex-start', color: 'var(--muted)' }}>
              <Icon name="lock" size={16} />คำตอบของคุณเก็บเป็นความลับตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)
            </div>
            <div className="detail-cta-inline">{cta}</div>
          </section>
        </aside>
      </div>

      <footer className="detail-cta">{cta}</footer>
    </main>
  );
}

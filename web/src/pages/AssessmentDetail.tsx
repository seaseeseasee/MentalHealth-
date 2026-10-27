import { Link, Navigate, useParams } from 'react-router-dom';
import { CATEGORIES, getAssessment, maxScore } from '../../../shared/assessments.ts';
import { useAuth } from '../auth.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { Icon } from '../components/Icon.tsx';
import { BackButton, TINTS } from '../components/ui.tsx';
import { loadDraft } from './Questionnaire.tsx';

const SCALE_TINTS = ['tint-mint ink-mint', 'tint-butter ink-butter', 'tint-peach ink-peach', 'tint-lav ink-lav', 'tint-peach ink-peach'];

export function AssessmentDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const a = getAssessment(id);
  if (!a) return <Navigate to="/assessments" replace />;

  const category = CATEGORIES.find((c) => c.id === a.category)!;
  const draft = loadDraft(user?.id, a.id);
  const answered = draft ? draft.answers.filter((v) => v !== null).length : 0;

  return (
    <main className="screen no-nav" style={{ padding: 0, gap: 0 }}>
      <section className={TINTS[a.id].tint} style={{ borderRadius: '0 0 32px 32px', padding: '16px 20px 20px' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <BackButton to="/assessments" />
          <span className={`chip ${TINTS[a.id].ink}`} style={{ background: '#fff' }}>{category.label}</span>
        </div>
        <div className="row" style={{ alignItems: 'flex-end', marginTop: 10 }}>
          <div className="grow" style={{ paddingBottom: 6 }}>
            <div className={`small ${TINTS[a.id].ink}`} style={{ fontWeight: 600 }}>{a.code}</div>
            <h1 style={{ fontSize: 25, marginTop: 2 }}>{a.name}</h1>
          </div>
          <Avatar config={user?.avatar} mood="calm" size={110} bg="#fff" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
          {[[`${a.items.length} ข้อ`, 'คำถาม'], [`~${a.minutes} นาที`, 'เวลาโดยประมาณ'], [`0–${maxScore(a)}`, 'ช่วงคะแนน']].map(([v, l]) => (
            <div key={l} style={{ background: '#fff', borderRadius: 16, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 18 }}>{v}</div>
              <div className="caption muted">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 16, flexGrow: 1 }}>
        <section>
          <h2 className="h2" style={{ marginBottom: 6 }}>เกี่ยวกับแบบประเมินนี้</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65 }}>{a.intro}</p>
        </section>

        <section>
          <h2 className="h2" style={{ marginBottom: 6 }}>วิธีตอบ</h2>
          <p style={{ margin: '0 0 10px', fontSize: 15, lineHeight: 1.65 }}><strong>{a.prompt}</strong> แล้วเลือกคำตอบที่ตรงกับตัวคุณมากที่สุด</p>
          {a.scale.length > 0 && (
            <div className="grid-2" style={{ gap: 8 }}>
              {a.scale.map((o, i) => (
                <div key={o.value} className="row" style={{ gap: 8, background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '8px 10px', fontSize: 13 }}>
                  <span className={SCALE_TINTS[i]} style={{ width: 24, height: 24, borderRadius: '50%', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{o.value}</span>
                  {o.label}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="h2" style={{ marginBottom: 8 }}>ก่อนเริ่ม อยากให้รู้ว่า</h2>
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 14, lineHeight: 1.55 }}>
            {['ไม่มีคำตอบถูกหรือผิด ตอบตามความรู้สึกจริงได้เลย', 'พักกลางคันได้ ระบบจะจำคำตอบไว้ในเครื่องนี้', 'ผลใช้คัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยโรค'].map((t) => (
              <li key={t} className="row" style={{ gap: 10, alignItems: 'flex-start' }}><span className="ink-mint"><Icon name="check" strokeWidth={2.4} /></span>{t}</li>
            ))}
          </ul>
        </section>

        {a.status === 'draft' && (
          <div className="alert" style={{ background: 'var(--sunken)' }}>
            <strong>แบบคัดกรองฉบับทดลอง</strong> · {a.source} เกณฑ์การแปลผลอยู่ระหว่างการตรวจสอบโดยผู้เชี่ยวชาญ
          </div>
        )}

        <div className="row alert tint-butter" style={{ alignItems: 'flex-start', gap: 10, color: '#5C4510' }}>
          <span className="ink-butter"><Icon name="lock" /></span>
          <span>คำตอบของคุณเก็บเป็นความลับตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)</span>
        </div>
      </div>

      <footer style={{ position: 'sticky', bottom: 0, padding: '12px 20px 24px', background: 'linear-gradient(transparent, var(--cream) 30%)' }}>
        <Link to={`/assessments/${a.id}/take`} className="btn btn-primary btn-lg btn-block">
          {answered > 0 ? `ทำต่อจากข้อ ${answered + 1}` : 'เริ่มทำแบบประเมิน'} <Icon name="arrow" strokeWidth={2.5} />
        </Link>
      </footer>
    </main>
  );
}

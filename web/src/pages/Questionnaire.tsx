import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { getAssessment, optionsFor, type Sex } from '../../../shared/assessments.ts';
import { api } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { Icon } from '../components/Icon.tsx';
import { BackButton, CrisisNotice } from '../components/ui.tsx';

interface Draft {
  index: number;
  answers: (number | null)[];
  sex: Sex | null;
}

export const DRAFT_PREFIX = 'mindease:draft:';

function draftKey(userId: number | undefined, id: string) {
  return `${DRAFT_PREFIX}${userId ?? 'anon'}:${id}`;
}

export function loadDraft(userId: number | undefined, id: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId, id));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function saveDraft(userId: number | undefined, id: string, draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(draftKey(userId, id), JSON.stringify(draft));
    else localStorage.removeItem(draftKey(userId, id));
  } catch {
    // Storage may be unavailable (private mode); the questionnaire still works without drafts.
  }
}

export function clearAllDrafts() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(DRAFT_PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: 'ชาย', value: 'male' },
  { label: 'หญิง', value: 'female' }
];

export function Questionnaire() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const a = getAssessment(id);

  const needsSexStep = !!a?.askSex;
  const [state, setState] = useState<Draft>(() => {
    const saved = a ? loadDraft(user?.id, a.id) : null;
    if (saved && a && saved.answers.length === a.items.length) return saved;
    return { index: needsSexStep && !user?.sex ? -1 : 0, answers: a ? a.items.map(() => null) : [], sex: user?.sex ?? null };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (a) saveDraft(user?.id, a.id, state);
  }, [a, user?.id, state]);

  if (!a) return <Navigate to="/assessments" replace />;

  const total = a.items.length;
  const { index, answers, sex } = state;
  const onSexStep = index === -1;
  const current = onSexStep ? sex : answers[index];
  const answered = current !== null;
  const isLast = index === total - 1;
  const showCrisis = a.crisisItem !== undefined && index === a.crisisItem && (answers[index] ?? 0) > 0;

  const cheer = onSexStep
    ? 'ขอถามข้อมูลนี้ก่อน เพื่อใช้เกณฑ์ที่เหมาะกับคุณ'
    : index === 0 ? 'ค่อยๆ ตอบนะ ไม่ต้องรีบ'
      : isLast ? 'ข้อสุดท้ายแล้ว ขอบคุณที่ใส่ใจตัวเอง'
        : index >= total / 2 ? 'มาครึ่งทางแล้ว เก่งมากเลย' : 'ตอบตามที่รู้สึกจริงได้เลยนะ';

  function choose(value: number | Sex) {
    setState((s) => {
      if (s.index === -1) return { ...s, sex: value as Sex };
      const next = s.answers.slice();
      next[s.index] = value as number;
      return { ...s, answers: next };
    });
  }

  function back() {
    if (index > (needsSexStep && !user?.sex ? -1 : 0)) setState((s) => ({ ...s, index: s.index - 1 }));
    else navigate(`/assessments/${a!.id}`);
  }

  async function next() {
    if (!answered) return;
    if (!isLast) {
      setState((s) => ({ ...s, index: s.index + 1 }));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { result } = await api.submitResult({ assessmentId: a!.id, answers: answers as number[], sex: a!.askSex ? sex : undefined });
      saveDraft(user?.id, a!.id, null);
      navigate(`/results/${result.id}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const options = onSexStep ? SEX_OPTIONS : optionsFor(a, index);
  const questionText = onSexStep ? 'เพศกำเนิดของคุณ' : a.items[index].text;
  const progress = onSexStep ? 0 : ((index + 1) / total) * 100;

  return (
    <main className="screen no-nav" style={{ paddingTop: 16 }}>
      <header className="row">
        <BackButton to={`/assessments/${a.id}`} label="ออกจากแบบประเมิน (คำตอบถูกบันทึกไว้)" icon="close" />
        <div className="grow">
          <div className="row small" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>{a.code}</span>
            <span className="muted">{onSexStep ? 'ข้อมูลเบื้องต้น' : `ข้อ ${index + 1} จาก ${total}`}</span>
          </div>
          <div className="progress" role="progressbar" aria-label="ความคืบหน้า" aria-valuemin={0} aria-valuemax={total} aria-valuenow={onSexStep ? 0 : index + 1}>
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <div className="row" style={{ alignItems: 'flex-end', gap: 10 }}>
        <Avatar config={user?.avatar} mood="calm" size={72} bg="var(--mint-50)" />
        <div className="bubble" style={{ marginBottom: 18 }} aria-live="polite">{cheer}</div>
      </div>

      <section className="card card-lg" style={{ padding: '20px 18px', flexGrow: 1 }}>
        {!onSexStep && <div className="small muted">{a.prompt}</div>}
        <h1 id="qtext" style={{ fontSize: 21, lineHeight: 1.45, margin: '6px 0 16px' }}>{questionText}</h1>
        <div role="radiogroup" aria-labelledby="qtext" className="stack" style={{ gap: 10 }}>
          {options.map((o) => {
            const selected = current === o.value;
            return (
              <label key={String(o.value)} className={`option${selected ? ' selected' : ''}`}>
                <input type="radio" name={`q-${index}`} value={String(o.value)} checked={selected} onChange={() => choose(o.value)} />
                <span className="dot" />
                <span className="grow">{o.label}</span>
              </label>
            );
          })}
        </div>
        {showCrisis && <div style={{ marginTop: 12 }}><CrisisNotice /></div>}
        {error && <div className="alert alert-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
      </section>

      <div className="row">
        <button type="button" className="btn btn-secondary" style={{ flex: '0 0 124px' }} onClick={back}>
          <Icon name="back" size={18} strokeWidth={2.4} />ย้อนกลับ
        </button>
        <button type="button" className="btn btn-primary grow" disabled={!answered || submitting} onClick={next}>
          {isLast ? (submitting ? 'กำลังประมวลผล…' : 'ดูผลการประเมิน') : 'ข้อถัดไป'}
          {!isLast && <Icon name="next" size={18} strokeWidth={2.4} />}
        </button>
      </div>
    </main>
  );
}

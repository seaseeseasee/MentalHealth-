import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { getAssessment, optionsFor, type Sex } from '../../../shared/assessments.ts';
import { api } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Icon } from '../components/Icon.tsx';
import { BackButton, CrisisNotice } from '../components/ui.tsx';

interface Draft {
  index: number;
  answers: (number | null)[];
  sex: Sex | null;
  /** Server-side attempt id, so the admin dashboard can count started vs completed questionnaires. */
  attemptId?: number;
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

  // Register the start of this questionnaire once. The server also de-duplicates re-opens within 24 hours.
  const hasAttempt = state.attemptId !== undefined;
  useEffect(() => {
    if (!a || hasAttempt) return;
    let cancelled = false;
    api.startAttempt(a.id)
      .then(({ attemptId }) => { if (!cancelled) setState((s) => ({ ...s, attemptId })); })
      .catch((e) => { if (!cancelled && (e as { status?: number }).status === 403) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [a, hasAttempt]);

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
      const { result } = await api.submitResult({ assessmentId: a!.id, answers: answers as number[], sex: a!.askSex ? sex : undefined, attemptId: state.attemptId });
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
    <main className="screen no-nav" style={{ paddingTop: 16, maxWidth: 640 }}>
      <section className="card card-lg" style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <header className="row" style={{ gap: 6 }}>
          <BackButton to={`/assessments/${a.id}`} label="ออกจากแบบประเมิน (คำตอบถูกบันทึกไว้)" />
          <h1 className="grow" style={{ fontSize: 17 }}>{a.name} ({a.code})</h1>
          <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{onSexStep ? 'เริ่มต้น' : `${index + 1} / ${total}`}</span>
        </header>
        <div className="progress" role="progressbar" aria-label="ความคืบหน้า" aria-valuemin={0} aria-valuemax={total} aria-valuenow={onSexStep ? 0 : index + 1}>
          <div style={{ width: `${progress}%` }} />
        </div>
        <div className="small muted" style={{ marginTop: 4 }}>
          {onSexStep ? 'ข้อมูลเบื้องต้น' : `ข้อ ${index + 1} / ${total} · ${a.prompt}`}
        </div>
        <h2 id="qtext" style={{ fontSize: 23, lineHeight: 1.45, margin: '0 0 4px', color: 'var(--ink)' }}>{questionText}</h2>
        <div role="radiogroup" aria-labelledby="qtext" className="stack" style={{ gap: 10 }}>
          {options.map((o, i) => {
            const selected = current === o.value;
            return (
              <label key={String(o.value)} className={`answer${selected ? ' selected' : ''}`}>
                <input type="radio" name={`q-${index}`} value={String(o.value)} checked={selected} onChange={() => choose(o.value)} />
                {!onSexStep && (
                  <span className="meter" aria-hidden="true">
                    {options.map((_, j) => <span key={j} className={j <= i ? 'on' : undefined} style={{ height: 8 + j * (14 / Math.max(1, options.length - 1)) }} />)}
                  </span>
                )}
                <span className="grow">{o.label}</span>
                {selected && <span className="tick" aria-hidden="true"><Icon name="check" size={14} strokeWidth={3} /></span>}
              </label>
            );
          })}
        </div>
        {showCrisis && <CrisisNotice />}
        {error && <div className="alert alert-error" role="alert">{error}</div>}
      </section>

      <div className="row">
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={back}>
          <Icon name="back" size={18} strokeWidth={2.4} />ก่อนหน้า
        </button>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={!answered || submitting} onClick={next}>
          {isLast ? (submitting ? 'กำลังประมวลผล…' : 'ดูผลการประเมิน') : 'ถัดไป'}
          {!isLast && <Icon name="next" size={18} strokeWidth={2.4} />}
        </button>
      </div>

      <div className="note-tip" aria-live="polite">
        <span className="icon-circle" style={{ width: 40, height: 40, background: '#FFE9A6', color: '#7A5200' }}><Icon name="bulb" size={20} /></span>
        <span>{cheer} · ไม่มีคำตอบที่ถูกหรือผิด</span>
      </div>
    </main>
  );
}

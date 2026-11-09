import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bandsFor, getAssessment } from '../../../shared/assessments.ts';
import { api, thaiDate, type Result } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Icon } from '../components/Icon.tsx';
import {
  AssessmentIcon, BackButton, CrisisNotice, Disclaimer, HelpLineCard, LEVEL_COLORS, LEVEL_FILLS, Loading
} from '../components/ui.tsx';

const CHIP: Record<string, { bg: string; fg: string }> = {
  good: { bg: 'var(--mint-50)', fg: 'var(--mint-700)' },
  mild: { bg: 'var(--butter-50)', fg: 'var(--butter-700)' },
  moderate: { bg: 'var(--peach-50)', fg: 'var(--peach-700)' },
  severe: { bg: 'var(--rose-50)', fg: 'var(--rose-700)' }
};

export function ResultPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.result(id).then(({ result }) => setResult(result)).catch((e) => setError((e as Error).message));
  }, [id]);

  if (error) return <main className="screen no-nav"><BackButton to="/home" icon="close" /><div className="alert alert-error">{error}</div></main>;
  if (!result) return <Loading />;

  const a = getAssessment(result.assessmentId);
  if (!a) return <Loading label="ไม่พบแบบประเมินนี้" />;
  const bands = bandsFor(a, result.sex);
  const band = bands.find((b) => result.score >= b.min && result.score <= b.max) ?? bands[bands.length - 1];
  const needsHelp = result.crisis || band.level === 'severe' || band.level === 'moderate';
  const span = result.max + 1;
  const marker = ((result.score + 0.5) / span) * 100;
  const chip = CHIP[band.level];

  return (
    <main className="screen no-nav" style={{ paddingTop: 16, gap: 14, maxWidth: 680 }}>
      <div className="print-only" style={{ borderBottom: '3px solid var(--lav-600)', paddingBottom: 10, marginBottom: 6 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, color: 'var(--heading)' }}>MindEase · รายงานผลการประเมินสุขภาพจิต</div>
        <div className="small muted">ชื่อที่ใช้แสดง: {user?.displayName} · วันที่ประเมิน: {thaiDate(result.createdAt)} · วันที่พิมพ์: {thaiDate(new Date().toISOString())}</div>
      </div>

      <header className="row no-print">
        <BackButton to="/home" label="ปิด" />
        <AssessmentIcon id={a.id} icon={a.icon} size={44} />
        <div className="grow" style={{ lineHeight: 1.3 }}>
          <h1 style={{ fontSize: 19 }}>ผลการประเมิน</h1>
          <div className="small muted">{a.name} ({a.code})</div>
        </div>
        <button type="button" className="btn btn-secondary" style={{ minHeight: 44, padding: '0 14px', fontSize: 14, whiteSpace: 'nowrap' }} onClick={() => window.print()} aria-label="บันทึกเป็น PDF หรือพิมพ์">
          <Icon name="download" size={16} strokeWidth={2.2} />PDF
        </button>
      </header>

      {result.crisis && <CrisisNotice />}

      <section className="card card-lg" style={{ background: 'linear-gradient(160deg, #fff 0%, var(--lav-50) 100%)', padding: '20px 18px 18px', overflow: 'hidden' }}>
        <div className="row" style={{ alignItems: 'flex-end', gap: 4 }}>
          <div className="grow stack" style={{ gap: 8, paddingBottom: 8 }}>
            <div style={{ fontFamily: 'var(--font-head)', lineHeight: 1, color: 'var(--lav-600)' }} aria-label={`คะแนน ${result.score} จาก ${result.max}`}>
              <span style={{ fontSize: 60, fontWeight: 600 }}>{result.score}</span>
              <span style={{ fontSize: 22, color: 'var(--heading)' }}> / {result.max}</span>
            </div>
            <div className="small muted" style={{ marginTop: -4 }}>คะแนน</div>
            <span className="chip" style={{ alignSelf: 'flex-start', fontSize: 15, padding: '6px 14px', background: chip.bg, color: chip.fg }}>{band.label}</span>
            <span className="caption muted" style={{ fontSize: 12.5 }}>
              {a.direction === 'higher-better' ? 'คะแนนสูง = ดี' : 'คะแนนต่ำ = ดี'} · {thaiDate(result.createdAt)}
            </span>
          </div>
          <img
            src={band.level === 'good' ? '/illustrations/cheer.webp' : '/illustrations/hug.webp'}
            alt="" width="170" height="170"
            style={{ width: 'min(170px, 40%)', height: 'auto', marginBottom: -18, marginRight: -8 }}
          />
        </div>

        <div style={{ marginTop: 18 }} aria-hidden="true">
          <div className="band-bar">
            {bands.map((b, i) => (
              <span key={i} style={{ width: `${((b.max - b.min + 1) / span) * 100}%`, background: LEVEL_FILLS[b.level], opacity: b === band ? 1 : 0.55 }} />
            ))}
            <span className="band-marker" style={{ left: `${marker}%` }} />
          </div>
        </div>
        <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px 12px', fontSize: 13 }}>
          {bands.map((b, i) => (
            <li key={i} className="row" style={{ gap: 6, fontWeight: b === band ? 600 : 400, color: b === band ? LEVEL_COLORS[b.level] : 'var(--muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: LEVEL_FILLS[b.level], flexShrink: 0 }} />
              {b.min}–{b.max} {b.label}
            </li>
          ))}
        </ul>

        {result.domains.length > 0 && (
          <div className="stack" style={{ marginTop: 16, gap: 10 }}>
            <div className="small" style={{ fontWeight: 600 }}>คะแนนรายด้าน</div>
            {result.domains.map((d) => (
              <div key={d.id} className="row small" style={{ gap: 10 }}>
                <span style={{ width: 36 }}>{d.label}</span>
                <div className="progress grow"><div style={{ width: `${(d.score / d.max) * 100}%` }} /></div>
                <span className="muted" style={{ width: 44, textAlign: 'right' }}>{d.score}/{d.max}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <span className="icon-circle" style={{ width: 40, height: 40, background: 'var(--lav-50)', color: 'var(--lav-600)' }}><Icon name="file" size={20} /></span>
        <div>
          <h2 className="h2" style={{ marginBottom: 4 }}>สรุปผล</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65 }}>{band.summary}</p>
        </div>
      </section>

      <section className="card row" style={{ alignItems: 'flex-end', gap: 8 }}>
        <div className="grow">
          <div className="row" style={{ gap: 10, marginBottom: 10 }}>
            <span className="icon-circle" style={{ width: 40, height: 40, background: 'var(--butter-50)', color: 'var(--butter-700)' }}><Icon name="bulb" size={20} /></span>
            <h2 className="h2">คำแนะนำ</h2>
          </div>
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 15, gap: 10 }}>
            {band.advice.map((t) => (
              <li key={t} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span className="icon-circle" style={{ width: 24, height: 24, background: '#2E9E62', marginTop: 1 }}><Icon name="check" size={14} strokeWidth={3} /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <img src="/illustrations/plant.webp" alt="" width="80" height="109" style={{ width: 80, height: 'auto' }} />
      </section>

      {needsHelp && <HelpLineCard />}
      <Disclaimer />

      <div className="row no-print" style={{ marginTop: 'auto' }}>
        <Link to="/history" className="btn btn-secondary" style={{ flex: 1 }}>ดูแนวโน้ม</Link>
        <Link to="/care" className="btn btn-primary" style={{ flex: 1 }}>ไปที่ดูแลใจ</Link>
      </div>
    </main>
  );
}

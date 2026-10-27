import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bandsFor, getAssessment } from '../../../shared/assessments.ts';
import { api, thaiDate, type Result } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { Icon } from '../components/Icon.tsx';
import { BackButton, BandScale, CrisisNotice, Disclaimer, HelpLineCard, LevelChip, Loading, ScoreGauge } from '../components/ui.tsx';

const ADVICE_ICONS = ['moon', 'walk', 'chat'];
const ADVICE_TINTS = ['tint-lav ink-lav', 'tint-mint ink-mint', 'tint-peach ink-peach'];

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

  return (
    <main className="screen no-nav" style={{ paddingTop: 16, gap: 14 }}>
      <header className="row">
        <BackButton to="/home" label="ปิด" icon="close" />
        <h1 className="grow" style={{ fontSize: 20 }}>ผลการประเมิน</h1>
        <span className="small muted">{thaiDate(result.createdAt)}</span>
      </header>

      {result.crisis && <CrisisNotice />}

      <section className="card card-lg">
        <div className="row" style={{ gap: 14 }}>
          <ScoreGauge score={result.score} max={result.max} level={band.level} />
          <div>
            <LevelChip level={band.level} label={band.label} />
            <h2 style={{ fontSize: 18, lineHeight: 1.4, margin: '8px 0 4px' }}>{a.name}</h2>
            <div className="small muted">{a.code}{a.direction === 'higher-better' ? ' · คะแนนสูง = ดี' : ''}</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <BandScale bands={bands} current={band} />
        </div>
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

      <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
        <Avatar config={user?.avatar} mood={band.level === 'good' ? 'happy' : 'calm'} size={52} bg="var(--lav-50)" />
        <p className="bubble bubble-soft" style={{ margin: 0 }}>{band.summary}</p>
      </div>

      <section>
        <h2 className="h2" style={{ fontSize: 16, marginBottom: 8 }}>ลองเริ่มจากสิ่งเล็กๆ เหล่านี้</h2>
        <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 14 }}>
          {band.advice.map((t, i) => (
            <li key={t} className="row" style={{ gap: 10 }}>
              <span className={ADVICE_TINTS[i % 3]} style={{ width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={ADVICE_ICONS[i % 3]} size={16} strokeWidth={2.2} />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </section>

      {needsHelp && <HelpLineCard />}
      <Disclaimer />

      <div className="row" style={{ marginTop: 'auto' }}>
        <Link to="/history" className="btn btn-secondary" style={{ flex: 1 }}>ดูแนวโน้ม</Link>
        <Link to="/care" className="btn btn-primary" style={{ flex: 1.4 }}>ไปที่ดูแลใจ</Link>
      </div>
    </main>
  );
}

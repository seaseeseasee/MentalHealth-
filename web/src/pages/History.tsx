import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bandsFor, getAssessment } from '../../../shared/assessments.ts';
import { api, thaiDate, thaiMonth, useLiveData, type Result } from '../api.ts';
import { Icon } from '../components/Icon.tsx';
import { LevelChip, Loading, TrendChart } from '../components/ui.tsx';

export function History() {
  const [results, setResults] = useState<Result[] | null>(null);
  const [tab, setTab] = useState<string | null>(null);

  useLiveData(() => {
    api.results().then(({ results }) => {
      setResults(results);
      setTab((t) => (t && results.some((r) => r.assessmentId === t) ? t : results[0]?.assessmentId ?? null));
    }).catch(() => setResults((r) => r ?? []));
  });

  // Assessments the user has taken, most recent first.
  const taken = useMemo(() => {
    const seen: string[] = [];
    for (const r of results ?? []) if (!seen.includes(r.assessmentId)) seen.push(r.assessmentId);
    return seen;
  }, [results]);

  if (!results) return <Loading />;

  const a = tab ? getAssessment(tab) : undefined;
  const series = results.filter((r) => r.assessmentId === tab).slice(0, 8).reverse();
  const latest = series[series.length - 1];
  const prev = series[series.length - 2];
  let delta = '';
  let deltaClass = 'level-mild';
  if (latest && prev && a) {
    const diff = latest.score - prev.score;
    const better = a.direction === 'higher-better' ? diff > 0 : diff < 0;
    delta = diff === 0 ? 'เท่าเดิม' : `${diff > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(diff)}`;
    deltaClass = diff === 0 ? 'level-mild' : better ? 'level-good' : 'level-moderate';
  }

  return (
    <main className="screen">
      <header>
        <h1 className="h1">ประวัติและแนวโน้ม</h1>
        <p className="small muted" style={{ margin: '2px 0 0' }}>ดูการเปลี่ยนแปลงของใจคุณตามเวลา</p>
      </header>

      {results.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px' }}>ยังไม่มีประวัติการประเมิน</p>
          <Link to="/assessments" className="btn btn-primary">เลือกแบบประเมิน</Link>
        </div>
      ) : (
        <>
          <div className="filter-row" role="tablist" aria-label="เลือกแบบประเมิน">
            {taken.map((id) => (
              <button key={id} type="button" role="tab" className="filter" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => setTab(id)}>
                {getAssessment(id)?.code ?? id}
              </button>
            ))}
          </div>

          {a && latest && (
            <section className="card" style={{ padding: '16px 14px 12px' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 4px' }}>
                <div>
                  <div className="small muted">ล่าสุด · {a.code} {a.name}</div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, lineHeight: 1.2 }}>
                    {latest.score}<span className="muted" style={{ fontSize: 15 }}> / {latest.max}</span>
                  </div>
                </div>
                {delta && <span className={`chip ${deltaClass}`} style={{ marginTop: 4 }}>{delta}</span>}
              </div>
              <div style={{ marginTop: 8 }}>
                <TrendChart
                  points={series.map((r) => ({ label: series.length > 6 ? thaiMonth(r.createdAt) : thaiDate(r.createdAt, false), value: r.score }))}
                  max={latest.max}
                  bands={bandsFor(a, latest.sex)}
                  ariaLabel={`กราฟคะแนน ${a.code} ${series.length} ครั้งล่าสุด ล่าสุด ${latest.score} คะแนน`}
                />
              </div>
              <div className="caption muted" style={{ padding: '4px 4px 0' }}>
                {a.direction === 'higher-better' ? 'คะแนนสูง = ดี' : 'คะแนนต่ำ = ดี'} · แถบสีคือช่วงระดับผล
              </div>
            </section>
          )}

          <section>
            <h2 className="h2" style={{ fontSize: 16, marginBottom: 8 }}>บันทึกทั้งหมด</h2>
            <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {results.map((r) => {
                const def = getAssessment(r.assessmentId);
                const d = new Date(r.createdAt);
                return (
                  <li key={r.id}>
                    <Link to={`/results/${r.id}`} className="list-link" style={{ boxShadow: 'none', borderRadius: 16, padding: '10px 14px' }}>
                      <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, lineHeight: 1.1 }}>{d.getDate()}</div>
                        <div className="caption muted">{thaiMonth(r.createdAt)}</div>
                      </div>
                      <div className="grow">
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{def?.code} {def?.name}</div>
                        <div className="caption muted">{r.score} / {r.max} คะแนน</div>
                      </div>
                      <LevelChip level={r.level} label={r.bandLabel} />
                      <Icon name="next" size={16} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

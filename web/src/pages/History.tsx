import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bandsFor, getAssessment } from '../../../shared/assessments.ts';
import { api, thaiDate, thaiMonth, useLiveData, type Result } from '../api.ts';
import { Icon } from '../components/Icon.tsx';
import { AssessmentIcon, LevelChip, Loading, TrendChart } from '../components/ui.tsx';

type View = 'trend' | 'list';

export function History() {
  const [results, setResults] = useState<Result[] | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [view, setView] = useState<View>('trend');
  const [listFilter, setListFilter] = useState<string>('all');

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
    delta = diff === 0 ? 'เท่าเดิม' : `${diff > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(diff)} · ${better ? 'ดีขึ้น' : 'ควรติดตาม'}`;
    deltaClass = diff === 0 ? 'level-mild' : better ? 'level-good' : 'level-moderate';
  }
  const listed = results.filter((r) => listFilter === 'all' || r.assessmentId === listFilter);

  return (
    <main className="screen wide history">
      <header className="history-hero">
        <div className="grow" style={{ minWidth: 0, padding: '18px 0' }}>
          <h1 className="h1">ประวัติและแนวโน้ม</h1>
          <p className="small muted" style={{ margin: '2px 0 12px' }}>ดูการเปลี่ยนแปลงของใจคุณตามเวลา</p>
          <div className="history-sum">
            <div><b>{results.length}</b><span>ครั้งที่ประเมิน</span></div>
            <div><b>{taken.length}</b><span>แบบที่เคยทำ</span></div>
            <div><b>{results[0] ? thaiDate(results[0].createdAt, false) : '–'}</b><span>ครั้งล่าสุด</span></div>
          </div>
        </div>
        <img src="/illustrations/cheer.webp" alt="" width="170" height="160" className="history-hero-img" />
      </header>

      {results.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <img src="/illustrations/plant.webp" alt="" width="90" height="122" style={{ width: 90, height: 'auto' }} />
          <p style={{ margin: '8px 0 14px' }}>ยังไม่มีประวัติการประเมิน ลองเริ่มจากแบบที่ใช้เวลาไม่นาน</p>
          <Link to="/assessments" className="btn btn-primary">เลือกแบบประเมิน</Link>
        </div>
      ) : (
        <>
          <div className="segmented" role="tablist" aria-label="มุมมอง" style={{ maxWidth: 420 }}>
            <button type="button" role="tab" aria-selected={view === 'trend'} onClick={() => setView('trend')}>แนวโน้ม</button>
            <button type="button" role="tab" aria-selected={view === 'list'} onClick={() => setView('list')}>รายการทั้งหมด</button>
          </div>

          {view === 'trend' ? (
            <>
              <div className="filter-row" role="tablist" aria-label="เลือกแบบประเมิน">
                {taken.map((id) => (
                  <button key={id} type="button" role="tab" className="filter" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => setTab(id)}>
                    {getAssessment(id)?.code ?? id}
                  </button>
                ))}
              </div>

              <div className="history-grid">
                {a && latest && (
                  <section className="card card-lg" style={{ padding: '18px 16px 12px', minWidth: 0 }}>
                    <div className="row" style={{ alignItems: 'flex-start', padding: '0 4px', flexWrap: 'wrap' }}>
                      <AssessmentIcon id={a.id} icon={a.icon} size={42} />
                      <div className="grow">
                        <div className="small muted">{a.name} ({a.code}) · ล่าสุด {thaiDate(latest.createdAt)}</div>
                        <div style={{ fontFamily: 'var(--font-head)', fontSize: 30, lineHeight: 1.2, color: 'var(--lav-600)' }}>
                          {latest.score}<span className="muted" style={{ fontSize: 15 }}> / {latest.max}</span>
                        </div>
                      </div>
                      <div className="stack" style={{ alignItems: 'flex-end', gap: 6 }}>
                        <LevelChip level={latest.level} label={latest.bandLabel} />
                        {delta && <span className={`chip ${deltaClass}`} style={{ fontSize: 12 }}>{delta}</span>}
                      </div>
                    </div>
                    <div style={{ marginTop: 10, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
                      <TrendChart
                        points={series.map((r) => ({ label: series.length > 6 ? thaiMonth(r.createdAt) : thaiDate(r.createdAt, false), value: r.score }))}
                        max={latest.max}
                        bands={bandsFor(a, latest.sex)}
                        ariaLabel={`กราฟคะแนน ${a.code} ${series.length} ครั้งล่าสุด ล่าสุด ${latest.score} คะแนน`}
                      />
                    </div>
                    <div className="caption muted" style={{ padding: '4px 4px 0' }}>
                      {a.direction === 'higher-better' ? 'คะแนนสูง = ดี' : 'คะแนนต่ำ = ดี'} · แถบสีพื้นหลังคือช่วงระดับผล · แสดง {series.length} ครั้งล่าสุด
                    </div>
                  </section>
                )}

                <section className="stack" style={{ gap: 10, minWidth: 0 }}>
                  <h2 className="h2">ผลล่าสุดของแต่ละแบบ</h2>
                  {taken.map((id) => {
                    const def = getAssessment(id);
                    const r = results.find((x) => x.assessmentId === id)!;
                    if (!def) return null;
                    return (
                      <Link key={id} to={`/results/${r.id}`} className="list-link" style={{ borderRadius: 18, padding: '10px 12px' }}>
                        <AssessmentIcon id={def.id} icon={def.icon} size={40} />
                        <span className="grow">
                          <span style={{ display: 'block', fontWeight: 600, fontSize: 14.5 }}>{def.code} · {r.score}/{r.max}</span>
                          <span className="caption muted">{thaiDate(r.createdAt)}</span>
                        </span>
                        <LevelChip level={r.level} label={r.bandLabel} />
                      </Link>
                    );
                  })}
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="filter-row" role="group" aria-label="กรองตามแบบประเมิน">
                <button type="button" className="filter" aria-pressed={listFilter === 'all'} onClick={() => setListFilter('all')}>ทั้งหมด {results.length}</button>
                {taken.map((id) => (
                  <button key={id} type="button" className="filter" aria-pressed={listFilter === id} onClick={() => setListFilter(id)}>{getAssessment(id)?.code ?? id}</button>
                ))}
              </div>
              <section className="card" style={{ padding: '4px 14px' }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {listed.map((r, i) => {
                    const def = getAssessment(r.assessmentId);
                    const d = new Date(r.createdAt);
                    return (
                      <li key={r.id} style={{ borderTop: i === 0 ? 0 : '1px solid var(--sunken)' }}>
                        <Link to={`/results/${r.id}`} className="row" style={{ padding: '12px 2px', textDecoration: 'none', color: 'var(--ink)' }}>
                          <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'var(--font-head)', fontSize: 19, lineHeight: 1.1, color: 'var(--heading)' }}>{d.getDate()}</div>
                            <div className="caption muted">{thaiMonth(r.createdAt)} {String(d.getFullYear() + 543).slice(2)}</div>
                          </div>
                          {def && <AssessmentIcon id={def.id} icon={def.icon} size={38} />}
                          <div className="grow">
                            <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{def?.code} · {r.score}/{r.max}</div>
                            <div className="caption muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{def?.name}</div>
                          </div>
                          <LevelChip level={r.level} label={r.bandLabel} />
                          <span className="hide-sm"><Icon name="next" size={16} /></span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}

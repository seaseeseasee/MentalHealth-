import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ASSESSMENTS, CATEGORIES, type CategoryId } from '../../../shared/assessments.ts';
import { api, useLiveData } from '../api.ts';
import { useAuth } from '../auth.tsx';
import { Icon } from '../components/Icon.tsx';
import { AssessmentIcon } from '../components/ui.tsx';
import { loadDraft } from './Questionnaire.tsx';

const FILTER_LABELS: Record<CategoryId, string> = { mood: 'อารมณ์', strength: 'จุดแข็งทางใจ', life: 'พฤติกรรม', work: 'สมอง/งาน' };

/** Case-insensitive match on name, code and description; ignores spaces and dashes so "phq9" finds "PHQ-9". */
function matches(text: string, q: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[\s-]/g, '');
  return norm(text).includes(norm(q));
}

export function AssessmentList() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');
  const [query, setQuery] = useState('');
  const [disabled, setDisabled] = useState<string[]>([]);

  useLiveData(() => {
    api.availability().then((r) => setDisabled(r.disabled)).catch(() => undefined);
  });

  const list = ASSESSMENTS.filter((a) =>
    !disabled.includes(a.id) &&
    (filter === 'all' || a.category === filter) &&
    (!query.trim() || matches(`${a.name} ${a.code} ${a.intro}`, query.trim()))
  );

  return (
    <main className="screen">
      <header>
        <h1 className="h1">เลือกแบบประเมิน</h1>
        <p className="small muted" style={{ margin: '2px 0 0' }}>เลือกเรื่องที่อยากเช็กใจวันนี้</p>
      </header>

      <label className="search">
        <Icon name="search" size={18} />
        <span className="sr-only">ค้นหาแบบประเมิน</span>
        <input type="search" placeholder="ค้นหาแบบประเมิน เช่น เครียด, PHQ-9" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      <div className="filter-row" role="group" aria-label="กรองตามหมวด">
        <button type="button" className="filter" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>ทั้งหมด</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" className="filter" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>{FILTER_LABELS[c.id]}</button>
        ))}
      </div>

      <section className="card" style={{ padding: '4px 14px' }} aria-live="polite">
        {list.length === 0 ? (
          <p className="small muted" style={{ textAlign: 'center', margin: '18px 0' }}>ไม่พบแบบประเมินที่ตรงกับ “{query}”</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {list.map((a, i) => {
              const draft = loadDraft(user?.id, a.id);
              const answered = draft ? draft.answers.filter((v) => v !== null).length : 0;
              return (
                <li key={a.id} style={{ borderTop: i === 0 ? 0 : '1px solid var(--sunken)' }}>
                  <Link to={`/assessments/${a.id}`} className="row" style={{ padding: '12px 2px', textDecoration: 'none', color: 'var(--ink)' }}>
                    <AssessmentIcon id={a.id} icon={a.icon} />
                    <span className="grow">
                      <span style={{ display: 'block', fontWeight: 600, fontSize: 15.5, lineHeight: 1.35 }}>
                        {a.name} <span className="muted" style={{ fontWeight: 400 }}>({a.code})</span>
                      </span>
                      <span className="caption muted" style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.items.length} ข้อ · ~{a.minutes} นาที · {a.intro}
                      </span>
                      {(answered > 0 || a.status === 'draft') && (
                        <span className="row" style={{ gap: 6, marginTop: 4 }}>
                          {answered > 0 && <span className="chip level-mild" style={{ fontSize: 12, padding: '1px 8px' }}>ทำต่อ · ตอบแล้ว {answered}/{a.items.length}</span>}
                          {a.status === 'draft' && <span className="chip" style={{ fontSize: 12, padding: '1px 8px', background: 'var(--sunken)', color: 'var(--muted)' }}>ฉบับทดลอง</span>}
                        </span>
                      )}
                    </span>
                    <Icon name="next" size={18} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="note-info">
        <Icon name="info" size={18} />
        แบบประเมินนี้เป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยโรค หากมีความกังวล ควรปรึกษาผู้เชี่ยวชาญ
      </div>
    </main>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ASSESSMENTS, CATEGORIES, type CategoryId } from '../../../shared/assessments.ts';
import { useAuth } from '../auth.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { Icon } from '../components/Icon.tsx';
import { TINTS } from '../components/ui.tsx';

const FILTER_LABELS: Record<CategoryId, string> = { mood: 'อารมณ์', strength: 'จุดแข็ง', life: 'พฤติกรรม', work: 'การทำงาน' };

export function AssessmentList() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');
  const groups = CATEGORIES.filter((c) => filter === 'all' || c.id === filter);

  return (
    <main className="screen">
      <header className="row" style={{ alignItems: 'flex-end' }}>
        <div className="grow">
          <h1 className="h1">แบบประเมินทั้งหมด</h1>
          <p className="small muted" style={{ margin: '2px 0 0' }}>เลือกเรื่องที่อยากเช็กใจวันนี้</p>
        </div>
        <Avatar config={user?.avatar} mood="calm" size={56} bg="var(--mint-50)" />
      </header>

      <div className="filter-row" role="group" aria-label="กรองตามหมวด">
        <button type="button" className="filter" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>ทั้งหมด {ASSESSMENTS.length}</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" className="filter" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>{FILTER_LABELS[c.id]}</button>
        ))}
      </div>

      {groups.map((g) => (
        <section key={g.id}>
          <h2 style={{ fontWeight: 400, fontSize: 15, margin: '0 0 8px' }} className="muted">{g.label}</h2>
          <div className="stack">
            {ASSESSMENTS.filter((a) => a.category === g.id).map((a) => (
              <Link key={a.id} to={`/assessments/${a.id}`} className="list-link">
                <span className={`icon-tile ${TINTS[a.id].tint} ${TINTS[a.id].ink}`}><Icon name={a.icon} size={22} /></span>
                <span className="grow">
                  <span style={{ display: 'block', fontFamily: 'var(--font-head)', fontSize: 15, lineHeight: 1.35 }}>{a.name}</span>
                  <span className="caption muted" style={{ display: 'block' }}>{a.code} · {a.items.length} ข้อ · ~{a.minutes} นาที</span>
                </span>
                <Icon name="next" size={18} />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

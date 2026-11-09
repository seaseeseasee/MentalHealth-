import { useState } from 'react';
import { ASSESSMENTS } from '../../../shared/assessments.ts';
import { LEVEL_FILLS, LEVEL_NAMES } from '../components/ui.tsx';
import { ChartCard, Donut, LineChart, SERIES, StackedRows, fmtInt, fmtPct } from '../components/charts.tsx';
import { Icon } from '../components/Icon.tsx';
import { adminApi, periodLabel, useAdminData, type Granularity } from './adminApi.ts';
import { AdminState, useRange } from './AdminLayout.tsx';

/** Fixed colour per trend entity (colour follows the assessment, never its rank). Standard screening tools only. */
const TREND_IDS = ['phq9', 'st5', 'thi15', 'auditc'];
const TREND_COLOR: Record<string, string> = { phq9: SERIES[0], st5: SERIES[1], thi15: SERIES[2], auditc: SERIES[3] };

export function RiskAnalytics() {
  const { range } = useRange();
  const [assessmentId, setAssessmentId] = useState('');
  const [g, setG] = useState<Granularity>('month');
  const k = useAdminData(() => adminApi.risk(range, g, assessmentId || undefined), `${range.from}|${range.to}|${g}|${assessmentId}`);
  const d = k.data;
  const trendIds = assessmentId ? [assessmentId] : TREND_IDS;

  return (
    <div className="a-stackv">
      <div className="a-note strong" role="note">
        <Icon name="shield" size={18} />
        <span>
          ผลการประเมินเป็น<b>ข้อมูลคัดกรอง ไม่ใช่การวินิจฉัยโรค</b> และไม่ควรสรุปว่าผู้ใช้เป็นผู้ป่วยจากคะแนนเพียงอย่างเดียว ·
          นับเฉพาะผลที่ทำสำเร็จ · ใช้เกณฑ์การแปลผลจริงของแต่ละแบบ · กลุ่มที่มีน้อยกว่า {d?.minGroupSize ?? 5} รายการแสดงเป็น “&lt;{d?.minGroupSize ?? 5}” ·
          แบบประเมินฉบับทดลอง (EQ, RQ, Digital, Memory, Burnout) ยังไม่ผ่านการตรวจสอบทางคลินิก
        </span>
      </div>

      <div className="a-filters no-print">
        <label>แบบประเมิน
          <select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {ASSESSMENTS.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}{a.status === 'draft' ? ' (ทดลอง)' : ''}</option>)}
          </select>
        </label>
        <label>แนวโน้ม
          <select value={g} onChange={(e) => setG(e.target.value as Granularity)}>
            <option value="month">รายเดือน</option>
            <option value="year">รายปี</option>
            <option value="day">รายวัน</option>
          </select>
        </label>
      </div>

      <AdminState error={k.error} loading={k.loading} hasData={!!d} />
      {d && (
        <>
          <section className="a-kpis" aria-label="สรุปตามกลุ่มสีระดับผล">
            {d.levels.map((l) => (
              <div key={l.level} className="a-kpi" style={{ borderTop: `4px solid ${LEVEL_FILLS[l.level]}` }}>
                <span className="a-kpi-label">{LEVEL_NAMES[l.level]} <span className="a-muted">({l.level})</span></span>
                <span className="a-kpi-value">{l.count === null ? `<${d.minGroupSize}` : fmtInt(l.count)} <small>{l.pct === null ? '' : fmtPct(l.pct)}</small></span>
              </div>
            ))}
            <div className="a-kpi" style={{ borderTop: '4px solid #A8244E' }}>
              <span className="a-kpi-label">PHQ-9 ข้อ 9 ตอบมากกว่า 0</span>
              <span className="a-kpi-value">{d.crisis === null ? `<${d.minGroupSize}` : fmtInt(d.crisis)}</span>
              <span className="a-kpi-note">ในช่วงนี้ · ผู้ใช้ได้รับสายด่วน 1323 ทันที</span>
            </div>
          </section>

          <div className="a-grid2">
            <ChartCard title="สัดส่วนกลุ่มระดับผล" subtitle="รวมทุกแบบที่เลือก · กลุ่มสีตามเกณฑ์ของแต่ละแบบ (ไม่ใช่ระดับเดียวกันทุกแบบ)">
              {(d.total ?? 0) > 0 ? (
                <Donut centerLabel="ผลทั้งหมด" centerValue={d.total === null ? '<5' : fmtInt(d.total)}
                  segments={d.levels.map((l) => ({ label: LEVEL_NAMES[l.level], value: l.count, pct: l.pct, color: LEVEL_FILLS[l.level] }))} />
              ) : <div className="a-empty">ยังไม่มีผลในช่วงนี้ หรือมีน้อยกว่า {d.minGroupSize} รายการ</div>}
            </ChartCard>

            <ChartCard title="แบบประเมินที่พบผลระดับ “ควรดูแล/เสี่ยงสูง” มากที่สุด" subtitle={`จัดอันดับด้วยสัดส่วน · เฉพาะแบบที่มีผลอย่างน้อย ${d.rankMin} รายการ`}>
              {d.ranking.length === 0 ? <div className="a-empty">ยังมีข้อมูลไม่พอสำหรับจัดอันดับ</div> : (
                <ol className="a-rank">
                  {d.ranking.slice(0, 5).map((r) => {
                    const meta = ASSESSMENTS.find((a) => a.id === r.id)!;
                    return (
                      <li key={r.id}>
                        <b>{r.code}</b><span className="a-muted">{meta.name}{meta.status === 'draft' ? ' · ทดลอง' : ''}</span>
                        <span className="a-rank-bar"><span style={{ width: fmtPct(r.careRate) }} /></span>
                        <b>{fmtPct(r.careRate)}</b><span className="a-muted">n={fmtInt(r.n)}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </ChartCard>
          </div>

          <ChartCard
            title="เปรียบเทียบระดับผลระหว่างแบบประเมิน"
            subtitle="แต่ละแถวใช้ชื่อระดับจริงของแบบนั้น (Stacked 100%)"
            table={{
              head: ['แบบประเมิน', 'ระดับผล', 'ช่วงคะแนน', 'จำนวน', 'ร้อยละ'],
              rows: d.perAssessment.flatMap((a) => a.bands.map((b) => [a.code, b.label, b.range, b.count === null ? `<${d.minGroupSize}` : b.count, b.pct === null ? '—' : fmtPct(b.pct)]))
            }}
          >
            <StackedRows rows={d.perAssessment.map((a) => ({
              key: a.id,
              label: a.code,
              sub: a.status === 'draft' ? 'ฉบับทดลอง' : a.direction === 'higher-better' ? 'คะแนนสูง = ดี' : undefined,
              n: a.n === null ? `n<${d.minGroupSize}` : `n=${fmtInt(a.n)}`,
              segments: a.bands.map((b) => ({ label: b.label, color: LEVEL_FILLS[b.level], pct: b.pct, count: b.count }))
            }))} />
          </ChartCard>

          <ChartCard
            title={`แนวโน้มสัดส่วนผลระดับ “ควรดูแล/เสี่ยงสูง” ราย${g === 'day' ? 'วัน' : g === 'month' ? 'เดือน' : 'ปี'}`}
            subtitle={assessmentId ? undefined : 'แสดงเฉพาะแบบประเมินมาตรฐาน 4 แบบ · เลือกแบบอื่นได้จากตัวกรองด้านบน · ช่วงที่มีผลน้อยกว่าเกณฑ์จะเว้นว่าง'}
            table={{
              head: ['ช่วงเวลา', ...trendIds.map((id) => ASSESSMENTS.find((a) => a.id === id)!.code)],
              rows: d.trend.map((t) => [periodLabel(t.period), ...trendIds.map((id) => {
                const v = t.byAssessment[id];
                return !v ? '—' : v.careRate === null ? `n<${d.minGroupSize}` : `${fmtPct(v.careRate)} (n=${v.n})`;
              })])
            }}
          >
            <LineChart
              labels={d.trend.map((t) => periodLabel(t.period))}
              yMax={1}
              format={(n) => `${Math.round(n * 100)}%`}
              series={trendIds.map((id) => ({
                name: ASSESSMENTS.find((a) => a.id === id)!.code,
                color: TREND_COLOR[id] ?? SERIES[0],
                values: d.trend.map((t) => t.byAssessment[id]?.careRate ?? null)
              }))}
              ariaLabel="กราฟเส้นแนวโน้มสัดส่วนผลระดับควรดูแลหรือเสี่ยงสูง"
              emptyText={`ทุกช่วงเวลามีผลน้อยกว่า ${d.minGroupSize} รายการ จึงไม่แสดงเพื่อปกป้องข้อมูล ลองเลือกช่วงเวลาที่ยาวขึ้นหรือแนวโน้มรายปี`}
            />
          </ChartCard>
        </>
      )}
    </div>
  );
}

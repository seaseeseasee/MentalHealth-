import { ChartCard, DataTable, HBarList, LineChart, SERIES, fmtInt, fmtPct } from '../components/charts.tsx';
import { adminApi, periodLabel, useAdminData } from './adminApi.ts';
import { AdminState, Kpi, TrackingNote, useRange } from './AdminLayout.tsx';

export function AssessmentStats() {
  const { range } = useRange();
  const s = useAdminData(() => adminApi.assessments(range), `${range.from}|${range.to}`);
  const d = s.data;
  const byCompleted = d ? [...d.rows].sort((a, b) => b.completed - a.completed) : [];
  const totalCompleted = byCompleted.reduce((n, r) => n + r.completed, 0);
  const most = d?.rows.find((r) => r.id === d.mostUsed);
  const least = d?.rows.find((r) => r.id === d.leastUsed);
  const totalStarted = byCompleted.reduce((n, r) => n + r.started, 0);
  const totalOfStarted = byCompleted.reduce((n, r) => n + r.completedOfStarted, 0);

  return (
    <div className="a-stackv">
      <AdminState error={s.error} loading={s.loading} hasData={!!d} />
      {d && <TrackingNote since={d.trackingStartedAt} />}
      {d && (
        <>
          <section className="a-kpis">
            <Kpi icon="tests" label="เริ่มทำทั้งหมด" value={fmtInt(totalStarted)} tone="#5C9BF0" />
            <Kpi icon="check" label="ทำสำเร็จทั้งหมด" value={fmtInt(totalCompleted)} tone="#2E9E62" />
            <Kpi icon="chart" label="อัตราทำจนสำเร็จ" value={totalStarted ? fmtPct(totalOfStarted / totalStarted) : '—'} note="สำเร็จ ÷ เริ่มทำ (ของที่เริ่มในช่วงนี้)" tone="#7A58D6" />
            <Kpi icon="star" label="ได้รับความนิยมมากที่สุด" value={most && most.completed ? most.code : '—'} note={most && most.completed ? `${most.name} · ${fmtInt(most.completed)} ครั้ง` : 'ยังไม่มีข้อมูล'} />
            <Kpi icon="info" label="ใช้งานน้อยที่สุด" value={least && totalCompleted ? least.code : '—'} note={least && totalCompleted ? `${least.name} · ${fmtInt(least.completed)} ครั้ง` : 'ยังไม่มีข้อมูล'} />
          </section>

          <div className="a-grid2">
            <ChartCard title="เปรียบเทียบการใช้งานแต่ละแบบประเมิน" subtitle="เริ่มทำ เทียบกับ ทำสำเร็จ">
              <HBarList mainName="สำเร็จ" backName="เริ่มทำ" rows={byCompleted.map((r) => ({ label: r.code, value: r.completed, back: r.started }))} />
            </ChartCard>
            <ChartCard title="สัดส่วนการใช้งาน" subtitle="ร้อยละของการทำสำเร็จทั้งหมดในช่วงนี้">
              <HBarList mainName="สำเร็จ" rows={byCompleted.map((r) => ({
                label: r.code, value: r.completed, color: SERIES[0], note: totalCompleted ? `(${fmtPct(r.completed / totalCompleted)})` : undefined
              }))} />
            </ChartCard>
          </div>

          <ChartCard
            title="แนวโน้มการทำแบบประเมินสำเร็จ"
            subtitle={`รวมทุกแบบ · ราย${d.granularity === 'day' ? 'วัน' : d.granularity === 'month' ? 'เดือน' : 'ปี'}`}
            table={{ head: ['ช่วงเวลา', ...d.rows.map((r) => r.code), 'รวม'], rows: d.trend.map((t) => [periodLabel(t.period), ...d.rows.map((r) => t.counts[r.id] ?? 0), Object.values(t.counts).reduce((a, b) => a + b, 0)]) }}
          >
            <LineChart
              labels={d.trend.map((t) => periodLabel(t.period))}
              series={[{ name: 'ทำสำเร็จ (ครั้ง)', color: SERIES[0], values: d.trend.map((t) => Object.values(t.counts).reduce((a, b) => a + b, 0)) }]}
              ariaLabel="กราฟเส้นจำนวนการทำแบบประเมินสำเร็จต่อช่วงเวลา"
            />
          </ChartCard>

          <ChartCard title="ตารางสรุปรายแบบประเมิน" subtitle="ไม่สำเร็จ = เริ่มแล้วไม่ส่งคำตอบภายใน 24 ชั่วโมง · กำลังทำ = เริ่มไม่ถึง 24 ชั่วโมง">
            <DataTable data={{
              head: ['รหัส', 'ชื่อแบบประเมิน', 'สถานะ', 'เปิดใช้', 'เริ่มทำ', 'สำเร็จ', 'ผู้ทำ (คน)', 'ไม่สำเร็จ', 'กำลังทำ', 'อัตราสำเร็จ'],
              rows: d.rows.map((r) => [r.code, r.name, r.status === 'standard' ? 'มาตรฐาน' : 'ฉบับทดลอง', r.enabled ? 'เปิด' : 'ปิด',
                r.started, r.completed, r.completedUsers, r.incomplete, r.inProgress, r.completionRate === null ? '—' : fmtPct(r.completionRate)])
            }} />
          </ChartCard>
        </>
      )}
    </div>
  );
}

import { ChartCard, ColumnChart, Donut, LineChart, SERIES, fmtInt, fmtPct } from '../components/charts.tsx';
import { adminApi, periodLabel, useAdminData } from './adminApi.ts';
import { AdminState, Kpi, TrackingNote, useRange } from './AdminLayout.tsx';

const DEVICE_TH = { mobile: 'มือถือ', tablet: 'แท็บเล็ต', desktop: 'คอมพิวเตอร์', unknown: 'ไม่ทราบ' } as const;

export function UserStats() {
  const { range } = useRange();
  const u = useAdminData(() => adminApi.users(range), `${range.from}|${range.to}`);
  const d = u.data;
  const deviceTotal = d ? Object.values(d.devices).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="a-stackv">
      <AdminState error={u.error} loading={u.loading} hasData={!!d} />
      {d && <TrackingNote since={d.trackingStartedAt} />}
      {d && (
        <>
          <section className="a-kpis">
            <Kpi icon="users" label="ผู้ใช้งานทั้งหมด (สมัครแล้ว)" value={fmtInt(d.totals.registered)} note="ณ วันสุดท้ายของช่วง" />
            <Kpi icon="user" label="ผู้ใช้ใหม่" value={fmtInt(d.totals.newInRange)} note="สมัครในช่วงนี้" />
            <Kpi icon="clock" label="ผู้ใช้งานในช่วงนี้ (ไม่ซ้ำ)" value={fmtInt(d.totals.active)} note="เข้าใช้อย่างน้อย 1 ครั้ง" />
            <Kpi icon="history" label="ผู้ใช้ที่กลับมาใช้ซ้ำ" value={fmtInt(d.totals.returning)}
              note={`อัตรากลับมาใช้ ${d.totals.returnRate === null ? '—' : fmtPct(d.totals.returnRate)} (เข้าใช้ ≥ 2 วันต่างกัน)`} />
            <Kpi icon="calendar" label="ช่วงเวลาที่ใช้งานมากที่สุด" value={d.peakHour === null ? '—' : `${String(d.peakHour).padStart(2, '0')}:00–${String(d.peakHour).padStart(2, '0')}:59`} note="เวลาประเทศไทย" />
          </section>

          <ChartCard
            title={d.granularity === 'day' ? 'ผู้ใช้งานรายวัน' : d.granularity === 'month' ? 'ผู้ใช้งานรายเดือน' : 'ผู้ใช้งานรายปี'}
            subtitle="จำนวนคนไม่ซ้ำ แยกจากจำนวนครั้ง"
            table={{ head: ['ช่วงเวลา', 'ผู้เข้าใช้ (คน)', 'การเข้าใช้ (ครั้ง)', 'สมัครใหม่ (คน)'], rows: d.series.map((s) => [periodLabel(s.period), s.visitors, s.visits, s.newUsers]) }}
          >
            <LineChart
              labels={d.series.map((s) => periodLabel(s.period))}
              series={[
                { name: 'ผู้เข้าใช้ (คน)', color: SERIES[0], values: d.series.map((s) => s.visitors) },
                { name: 'การเข้าใช้ (ครั้ง)', color: SERIES[1], values: d.series.map((s) => s.visits), dashed: true },
                { name: 'สมัครใหม่ (คน)', color: SERIES[2], values: d.series.map((s) => s.newUsers) }
              ]}
              ariaLabel="กราฟเส้นผู้ใช้งานต่อช่วงเวลา"
            />
          </ChartCard>

          <div className="a-grid2">
            <ChartCard title="ช่วงเวลาที่มีการใช้งาน" subtitle="จำนวนการเข้าใช้ตามชั่วโมง (เวลาไทย) · แท่งเข้ม = มากที่สุด"
              table={{ head: ['ชั่วโมง', 'การเข้าใช้ (ครั้ง)'], rows: d.hours.map((n, h) => [`${String(h).padStart(2, '0')}:00`, n]) }}>
              <ColumnChart labels={d.hours.map((_, h) => String(h).padStart(2, '0'))} values={d.hours} highlight={d.peakHour} ariaLabel="กราฟแท่งจำนวนการเข้าใช้ตามชั่วโมง" />
            </ChartCard>
            <ChartCard title="อุปกรณ์ที่ใช้เข้าระบบ" subtitle="จัดประเภทจาก User-Agent ตอนบันทึก (ไม่เก็บ User-Agent เต็ม)">
              {deviceTotal > 0 ? (
                <Donut
                  centerLabel="การเข้าใช้" centerValue={fmtInt(deviceTotal)}
                  segments={(['mobile', 'desktop', 'tablet', 'unknown'] as const).map((k, i) => ({
                    label: DEVICE_TH[k], value: d.devices[k], pct: d.devices[k] / deviceTotal, color: k === 'unknown' ? '#9AACC6' : SERIES[i]
                  }))}
                />
              ) : <div className="a-empty">ยังไม่มีข้อมูลในช่วงเวลานี้</div>}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

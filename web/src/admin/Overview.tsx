import { Link, useSearchParams } from 'react-router-dom';
import { LEVEL_FILLS, LEVEL_NAMES } from '../components/ui.tsx';
import { ChartCard, DataTable, Donut, HBarList, LineChart, SERIES, fmtInt, fmtPct } from '../components/charts.tsx';
import { Icon } from '../components/Icon.tsx';
import { adminApi, periodLabel, useAdminData } from './adminApi.ts';
import { AdminState, Kpi, TrackingNote, useRange } from './AdminLayout.tsx';

const ACTION_TH: Record<string, string> = {
  export_csv: 'ส่งออกรายงาน CSV',
  print_report: 'พิมพ์รายงาน',
  enable_assessment: 'เปิดใช้แบบประเมิน',
  disable_assessment: 'ปิดใช้แบบประเมิน',
  set_role: 'เปลี่ยนสิทธิ์ผู้ใช้',
  set_role_cli: 'เปลี่ยนสิทธิ์ (คำสั่งระบบ)',
  set_min_group_size: 'ตั้งค่าขนาดกลุ่มขั้นต่ำ'
};

export function Overview() {
  const { range } = useRange();
  const [params] = useSearchParams();
  const search = params.toString() ? `?${params.toString()}` : '';
  const key = `${range.from}|${range.to}`;
  const o = useAdminData(() => adminApi.overview(range), key);
  const u = useAdminData(() => adminApi.users(range), key);
  const a = useAdminData(() => adminApi.assessments(range), key);
  const k = useAdminData(() => adminApi.risk(range), key);
  const act = useAdminData(() => adminApi.activity(), 'once');

  const ov = o.data;
  return (
    <div className="a-stackv">
      <AdminState error={o.error} loading={o.loading} hasData={!!ov} />
      {ov && <TrackingNote since={ov.trackingStartedAt} />}

      {ov && (
        <section className="a-kpis" aria-label="ตัวชี้วัดหลัก">
          <Kpi icon="users" label="ผู้ใช้งานทั้งหมด" value={fmtInt(ov.users.total)} note={`สมัครใหม่ในช่วงนี้ ${fmtInt(ov.users.newInRange)} คน`} />
          <Kpi icon="user" label="ผู้ใช้งาน (ไม่ซ้ำ) ในช่วงนี้" value={fmtInt(ov.users.activeInRange)} note={`ทำแบบประเมิน ${fmtInt(ov.users.assessorsInRange)} คน`} />
          <Kpi icon="logout" label="การเข้าใช้งานในช่วงนี้" value={fmtInt(ov.visits.inRange)} note="นับครั้ง (ห่างกันอย่างน้อย 30 นาที)" />
          <Kpi icon="clock" label="เข้าใช้งานวันนี้" value={fmtInt(ov.visits.today)} note={`${fmtInt(ov.visits.visitorsToday)} คน · เดือนนี้ ${fmtInt(ov.visits.thisMonth)} ครั้ง / ${fmtInt(ov.visits.visitorsThisMonth)} คน`} />
          <Kpi icon="tests" label="เริ่มทำแบบประเมิน" value={fmtInt(ov.assessments.started)} note="ในช่วงนี้" tone="#5C9BF0" />
          <Kpi icon="check" label="ทำแบบประเมินสำเร็จ" value={fmtInt(ov.assessments.completed)} note="ในช่วงนี้" tone="#2E9E62" />
          <Kpi icon="pause" label="ยังทำไม่เสร็จ" value={fmtInt(ov.assessments.incomplete + ov.assessments.inProgress)}
            note={`ทิ้งไว้เกิน 24 ชม. ${fmtInt(ov.assessments.incomplete)} · กำลังทำ ${fmtInt(ov.assessments.inProgress)}`} tone="#DD5F26" />
          <Kpi icon="chart" label="อัตราทำจนสำเร็จ" value={ov.assessments.completionRate === null ? '—' : fmtPct(ov.assessments.completionRate)}
            note={`เปิดใช้ ${ov.assessments.enabled}/${ov.assessments.total} แบบ (มาตรฐาน ${ov.assessments.standard} · ทดลอง ${ov.assessments.draft})`} tone="#7A58D6" />
        </section>
      )}

      <div className="a-grid2">
        <ChartCard
          title={u.data?.granularity === 'month' ? 'ผู้ใช้งานรายเดือน' : u.data?.granularity === 'year' ? 'ผู้ใช้งานรายปี' : 'ผู้ใช้งานรายวัน'}
          subtitle="คนไม่ซ้ำต่อช่วงเวลา"
          table={u.data ? { head: ['ช่วงเวลา', 'ผู้เข้าใช้ (คน)', 'ผู้ทำแบบประเมิน (คน)', 'การเข้าใช้ (ครั้ง)'], rows: u.data.series.map((s) => [periodLabel(s.period), s.visitors, s.assessors, s.visits]) } : undefined}
        >
          {u.data && (
            <LineChart
              labels={u.data.series.map((s) => periodLabel(s.period))}
              series={[
                { name: 'ผู้เข้าใช้ (คน)', color: SERIES[0], values: u.data.series.map((s) => s.visitors) },
                { name: 'ผู้ทำแบบประเมิน (คน)', color: SERIES[1], values: u.data.series.map((s) => s.assessors) }
              ]}
              ariaLabel="กราฟเส้นจำนวนผู้ใช้งานต่อช่วงเวลา"
            />
          )}
        </ChartCard>

        <ChartCard
          title="การทำแบบประเมินแต่ละประเภท"
          subtitle="เริ่มทำ เทียบกับ ทำสำเร็จ"
          table={a.data ? { head: ['แบบประเมิน', 'เริ่มทำ', 'สำเร็จ', 'อัตราสำเร็จ'], rows: a.data.rows.map((r) => [r.code, r.started, r.completed, r.completionRate === null ? '—' : fmtPct(r.completionRate)]) } : undefined}
        >
          {a.data && (
            <HBarList
              mainName="สำเร็จ" backName="เริ่มทำ"
              rows={[...a.data.rows].sort((x, y) => y.completed - x.completed).map((r) => ({ label: r.code, value: r.completed, back: r.started }))}
            />
          )}
        </ChartCard>
      </div>

      <div className="a-grid2">
        <ChartCard title="สรุปรายแบบประเมิน" actions={<Link to={'/admin/assessments' + search} className="a-link-btn">ดูทั้งหมด ›</Link>}>
          {a.data && (
            <DataTable data={{
              head: ['แบบประเมิน', 'เริ่มทำ', 'สำเร็จ', 'ไม่สำเร็จ', 'อัตราสำเร็จ'],
              rows: [...a.data.rows].sort((x, y) => y.completed - x.completed).slice(0, 6)
                .map((r) => [`${r.code}${r.status === 'draft' ? ' (ทดลอง)' : ''}`, r.started, r.completed, r.incomplete, r.completionRate === null ? '—' : fmtPct(r.completionRate)])
            }} />
          )}
        </ChartCard>

        <ChartCard
          title="ภาพรวมระดับผลการประเมิน"
          subtitle="นับเฉพาะผลที่ทำสำเร็จ · จัดกลุ่มสีตามเกณฑ์ของแต่ละแบบ"
          actions={<Link to={'/admin/risk' + search} className="a-link-btn">วิเคราะห์เพิ่มเติม ›</Link>}
        >
          {k.data && (k.data.total ?? 0) > 0 ? (
            <Donut
              centerLabel="ผลทั้งหมด"
              centerValue={k.data.total === null ? '<5' : fmtInt(k.data.total)}
              segments={k.data.levels.map((l) => ({ label: LEVEL_NAMES[l.level], value: l.count, pct: l.pct, color: LEVEL_FILLS[l.level] }))}
            />
          ) : k.data ? <div className="a-empty">ยังไม่มีผลการประเมินในช่วงนี้ หรือมีน้อยกว่า {k.data.minGroupSize} รายการ</div> : null}
          <p className="a-foot">ข้อมูลคัดกรอง ไม่ใช่การวินิจฉัยโรค</p>
        </ChartCard>
      </div>

      <section className="a-card">
        <div className="a-card-head"><h2>กิจกรรมล่าสุด</h2><span className="a-sub">ข้อมูลรวม ไม่ระบุตัวบุคคล</span></div>
        {act.data && (
          <>
            <ul className="a-activity">
              <li><Icon name="check" size={18} /><span>ทำแบบประเมินสำเร็จ <b>{fmtInt(act.data.completed24h)}</b> ครั้ง · เริ่มทำ <b>{fmtInt(act.data.started24h)}</b> ครั้ง ใน 24 ชม.</span></li>
              <li><Icon name="users" size={18} /><span>สมัครสมาชิกใหม่ <b>{fmtInt(act.data.newUsers24h)}</b> คน · เข้าใช้งาน <b>{fmtInt(act.data.visits24h)}</b> ครั้ง ใน 24 ชม.</span></li>
              <li className="warn"><Icon name="shield" size={18} /><span>PHQ-9 ข้อ 9 (ความคิดทำร้ายตนเอง) ตอบมากกว่า 0 ใน 7 วัน: <b>{act.data.crisis7d === null ? 'น้อยกว่า 5' : fmtInt(act.data.crisis7d)}</b> ครั้ง · ระบบแสดงสายด่วน 1323 ให้ผู้ใช้ทันที</span></li>
            </ul>
            <h3 className="a-h3">เหตุการณ์ของผู้ดูแลระบบ</h3>
            {act.data.adminEvents.length === 0 ? <p className="a-muted small">ยังไม่มี</p> : (
              <ul className="a-events">
                {act.data.adminEvents.map((e, i) => (
                  <li key={i}>
                    <span className="a-muted">{new Date(e.at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <span>{ACTION_TH[e.action] ?? e.action}{e.detail ? ` · ${e.detail}` : ''}</span>
                    <span className="a-muted">{e.admin ?? 'ระบบ'}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

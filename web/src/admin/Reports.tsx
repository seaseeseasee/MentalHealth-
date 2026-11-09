import { useState } from 'react';
import { DataTable, fmtPct } from '../components/charts.tsx';
import { Icon } from '../components/Icon.tsx';
import { adminApi, periodLabel, useAdminData } from './adminApi.ts';
import { AdminState, useRange } from './AdminLayout.tsx';

type ReportType = 'usage' | 'assessments' | 'risk';
const REPORTS: { id: ReportType; title: string; desc: string }[] = [
  { id: 'usage', title: 'รายงานการใช้งานระบบ', desc: 'การเข้าใช้ ผู้ใช้ไม่ซ้ำ ผู้ทำแบบประเมิน และสมาชิกใหม่ ต่อช่วงเวลา' },
  { id: 'assessments', title: 'รายงานสถิติแบบประเมิน', desc: 'เริ่มทำ ทำสำเร็จ ไม่สำเร็จ และอัตราสำเร็จ แยกตามแบบประเมิน' },
  { id: 'risk', title: 'รายงานภาพรวมระดับผลการประเมิน', desc: 'จำนวนและร้อยละในแต่ละระดับตามเกณฑ์ของแบบประเมิน (ข้อมูลคัดกรอง)' }
];

export function Reports() {
  const { range, label } = useRange();
  const [type, setType] = useState<ReportType>('usage');
  const key = `${type}|${range.from}|${range.to}`;
  const data = useAdminData(async () => {
    if (type === 'usage') {
      const u = await adminApi.users(range);
      return { head: ['ช่วงเวลา', 'การเข้าใช้ (ครั้ง)', 'ผู้เข้าใช้ (คน)', 'ผู้ทำแบบประเมิน (คน)', 'สมาชิกใหม่ (คน)'], rows: u.series.map((s) => [periodLabel(s.period), s.visits, s.visitors, s.assessors, s.newUsers]) };
    }
    if (type === 'assessments') {
      const a = await adminApi.assessments(range);
      return {
        head: ['รหัส', 'ชื่อแบบประเมิน', 'สถานะ', 'เริ่มทำ', 'สำเร็จ', 'ผู้ทำ (คน)', 'ไม่สำเร็จ', 'อัตราสำเร็จ'],
        rows: a.rows.map((r) => [r.code, r.name, r.status === 'standard' ? 'มาตรฐาน' : 'ฉบับทดลอง', r.started, r.completed, r.completedUsers, r.incomplete, r.completionRate === null ? '—' : fmtPct(r.completionRate)])
      };
    }
    const k = await adminApi.risk(range);
    return {
      head: ['แบบประเมิน', 'ระดับผล', 'ช่วงคะแนน', 'จำนวน', 'ร้อยละ', 'ผลทั้งหมด'],
      rows: k.perAssessment.flatMap((a) => a.bands.map((b) => [a.code, b.label, b.range, b.count === null ? `<${k.minGroupSize}` : b.count, b.pct === null ? '—' : fmtPct(b.pct), a.n === null ? `<${k.minGroupSize}` : a.n]))
    };
  }, key);

  const report = REPORTS.find((r) => r.id === type)!;
  const created = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });

  function print() {
    adminApi.printed(type).catch(() => undefined);
    window.print();
  }

  return (
    <div className="a-stackv">
      <div className="a-report-picker no-print" role="tablist" aria-label="เลือกรายงาน">
        {REPORTS.map((r) => (
          <button key={r.id} type="button" role="tab" aria-selected={type === r.id} onClick={() => setType(r.id)}>
            <Icon name="file" size={20} />
            <span><b>{r.title}</b><span>{r.desc}</span></span>
          </button>
        ))}
      </div>

      <section className="a-card a-report">
        <div className="a-report-head">
          <div>
            <div className="a-muted small print-only">MindEase · ระบบประเมินสุขภาพจิตเบื้องต้น</div>
            <h2 style={{ fontSize: 22 }}>{report.title}</h2>
            <div className="a-sub">วันที่จัดทำ: {created} · ช่วงเวลาที่วิเคราะห์: {label}</div>
          </div>
          <div className="row no-print" style={{ gap: 8, flexWrap: 'wrap' }}>
            <a className="btn btn-secondary" style={{ minHeight: 44, fontSize: 15 }} href={adminApi.csvUrl(type, range)} download>
              <Icon name="download" size={18} />Excel / CSV
            </a>
            <button type="button" className="btn btn-primary" style={{ minHeight: 44, fontSize: 15 }} onClick={print}>
              <Icon name="printer" size={18} />พิมพ์ / PDF
            </button>
          </div>
        </div>
        <AdminState error={data.error} loading={data.loading} hasData={!!data.data} />
        {data.data && <DataTable data={data.data} />}
        <p className="a-foot">
          ข้อมูลรวม ไม่ระบุตัวบุคคล · ผลการประเมินเป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย · เวลาประเทศไทย ·
          การส่งออกและการพิมพ์ทุกครั้งถูกบันทึกในประวัติการใช้งานของผู้ดูแลระบบ
        </p>
      </section>
    </div>
  );
}

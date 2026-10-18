// คำอธิบายไฟล์: หน้าสำหรับ ADMIN เพื่อดูและจัดการข้อมูลตามสิทธิ์ของผู้ดูแลระบบ
import Link from "next/link";
import Badge from "@/components/Badge";
import { dashboardStats } from "@/lib/services/borrowing";
import { fmtDate } from "@/lib/format";
import { pageUser } from "@/lib/guard";

export const dynamic = "force-dynamic";
type Row = { id: string; borrowingCode: string; borrower: { name: string }; expectedReturnDate: Date; displayStatus: string };
function Table({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) {
  return (
    <section><h2 className="mb-2 font-semibold">{title}</h2>
      <div className="card overflow-x-auto p-0"><table className="w-full"><thead><tr><th className="th">รหัส</th><th className="th">ผู้ยืม</th><th className="th">กำหนดคืน</th><th className="th">สถานะ</th></tr></thead>
        <tbody className="divide-y">{rows.map((b) => <tr key={b.id}><td className="td"><Link className="underline" href={`/admin/borrowings/${b.id}`}>{b.borrowingCode}</Link></td><td className="td">{b.borrower.name}</td><td className="td">{fmtDate(b.expectedReturnDate)}</td><td className="td"><Badge status={b.displayStatus} /></td></tr>)}
          {rows.length === 0 && <tr><td colSpan={4} className="td text-center text-slate-500">{empty}</td></tr>}</tbody></table></div>
    </section>
  );
}
export default async function Dashboard() {
  await pageUser(true);
  const s = await dashboardStats();
  const cards: [string, number][] = [["ชนิดอุปกรณ์", s.equipmentTypes], ["ผู้ใช้ที่ใช้งานอยู่", s.activeUsers], ["คำขอรออนุมัติ", s.pendingRequests], ["กำลังถูกยืม (ชิ้น)", s.borrowedUnits], ["เกินกำหนดคืน", s.overdueBorrowings], ["บัญชีที่ถูกระงับ", s.suspendedUsers]];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">แดชบอร์ดผู้ดูแล</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(([l, n]) => <div key={l} className="card"><p className="text-sm text-slate-600">{l}</p><p className="text-2xl font-bold">{n}</p></div>)}
      </div>
      <Table title="คำขอล่าสุด" rows={s.recent} empty="ยังไม่มีรายการ" />
      <Table title="รายการเกินกำหนดคืน" rows={s.overdue} empty="ไม่มีรายการเกินกำหนด" />
    </div>
  );
}

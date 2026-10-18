// คำอธิบายไฟล์: หน้าสำหรับ USER เพื่อดูอุปกรณ์ จัดการคำขอยืมของตนเอง และดูโปรไฟล์
import Link from "next/link";
import Badge from "@/components/Badge";
import { userHomeData } from "@/lib/services/borrowing";
import { fmtDate } from "@/lib/format";
import { pageRegularUser } from "@/lib/guard";

export const dynamic = "force-dynamic";
type B = Awaited<ReturnType<typeof userHomeData>>["pending"][number];
function List({ title, rows, empty }: { title: string; rows: B[]; empty: string }) {
  return (
    <section><h2 className="mb-2 font-semibold">{title}</h2>
      <div className="space-y-2">
        {rows.map((b) => (
          <Link key={b.id} href={`/user/borrowings/${b.id}`} className="card block hover:bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{b.borrowingCode}</span><Badge status={b.displayStatus} /></div>
            <p className="text-sm text-slate-600">{b.items.map((i) => `${i.equipment.name} ×${i.quantity}`).join(", ")} · กำหนดคืน {fmtDate(b.expectedReturnDate)}</p>
          </Link>))}
        {rows.length === 0 && <p className="card text-center text-sm text-slate-500">{empty}</p>}
      </div>
    </section>
  );
}
export default async function UserHome() {
  const user = await pageRegularUser();
  const d = await userHomeData(user.id);
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">สวัสดี {user.name}</h1><p className="text-sm text-slate-600">ค้นหาและขอยืมอุปกรณ์ หรือติดตามการยืมของคุณ</p></div>
      <form action="/user/equipment" className="card flex flex-wrap gap-2">
        <input name="search" placeholder="ค้นหาอุปกรณ์" aria-label="ค้นหาอุปกรณ์" className="field min-w-0 flex-1" />
        <button className="btn">ค้นหา</button><Link className="btn-ghost" href="/user/borrowings/new">ขอยืมอุปกรณ์</Link>
      </form>
      <section><h2 className="mb-2 font-semibold">หมวดหมู่ (จำนวนรายการที่พร้อมให้ยืม)</h2>
        <div className="flex flex-wrap gap-2">{d.categories.map((c) => <Link key={c.id} className="btn-ghost" href={`/user/equipment?categoryId=${c.id}&available=true`}>{c.name} ({c._count.equipment})</Link>)}
          {d.categories.length === 0 && <p className="text-sm text-slate-500">ยังไม่มีหมวดหมู่</p>}</div></section>
      <List title="กำลังยืม" rows={d.current} empty="ไม่มีอุปกรณ์ที่กำลังยืม" />
      <List title="คำขอที่รอดำเนินการ" rows={d.pending} empty="ไม่มีคำขอที่รอดำเนินการ" />
      <List title="ประวัติล่าสุด" rows={d.recent} empty="ยังไม่มีประวัติ" />
      <Link className="underline text-sm" href="/user/borrowings">ดูประวัติการยืมทั้งหมด</Link>
    </div>
  );
}

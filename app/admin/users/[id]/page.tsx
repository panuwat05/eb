// คำอธิบายไฟล์: หน้าสำหรับ ADMIN เพื่อดูและจัดการข้อมูลตามสิทธิ์ของผู้ดูแลระบบ
import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/Badge";
import UserStatusActions from "@/components/UserStatusActions";
import { pageUser } from "@/lib/guard";
import { getUserDetail } from "@/lib/services/users";
import { AppError } from "@/lib/api";
import { idSchema } from "@/lib/validation";
import { fmtDate, fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await pageUser(true);
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  let d;
  try { d = await getUserDetail(id.data); } catch (e) { if (e instanceof AppError && e.status === 404) notFound(); throw e; }
  const { user: u } = d;
  const section = (title: string, rows: typeof d.history, empty: string) => (
    <section><h2 className="mb-2 font-semibold">{title} ({rows.length})</h2>
      <div className="card overflow-x-auto p-0"><table className="w-full"><thead><tr><th className="th">รหัส</th><th className="th">อุปกรณ์</th><th className="th">กำหนดคืน</th><th className="th">สถานะ</th></tr></thead>
        <tbody className="divide-y">{rows.map((b) => <tr key={b.id}><td className="td"><Link className="underline" href={`/admin/borrowings/${b.id}`}>{b.borrowingCode}</Link></td><td className="td">{b.items.map((i) => `${i.equipment.name} ×${i.quantity}`).join(", ")}</td><td className="td">{fmtDate(b.expectedReturnDate)}</td><td className="td"><Badge status={b.displayStatus} /></td></tr>)}
          {rows.length === 0 && <tr><td colSpan={4} className="td text-center text-slate-500">{empty}</td></tr>}</tbody></table></div></section>
  );
  return (
    <div className="space-y-6">
      <Link className="text-sm underline" href="/admin/users">← กลับไปรายชื่อ</Link>
      <h1 className="text-2xl font-bold">{u.name}</h1>
      <div className="card space-y-1 text-sm">
        <p>อีเมล: {u.email}</p><p>บทบาท: {u.role === "ADMIN" ? "ผู้ดูแล" : "ผู้ใช้"}</p>
        <p>สถานะ: {u.status === "ACTIVE" ? "ใช้งานอยู่" : "ถูกระงับ"} · สมัครเมื่อ {fmtDate(u.createdAt)}</p>
        {u.suspendedAt && <p className="text-red-800">การระงับล่าสุด: {fmtDateTime(u.suspendedAt)}{u.suspendedBy && ` โดย ${u.suspendedBy.name}`}{u.suspendedReason && ` — เหตุผล: ${u.suspendedReason}`}{u.status === "ACTIVE" && " (เปิดใช้งานอีกครั้งแล้ว)"}</p>}
      </div>
      <UserStatusActions userId={u.id} status={u.status} isSelf={u.id === admin.id} />
      {section("กำลังยืม", d.current, "ไม่มีรายการที่กำลังยืม")}
      {section("เกินกำหนดคืน", d.overdue, "ไม่มีรายการเกินกำหนด")}
      {section("คำขอที่รอดำเนินการ", d.pending, "ไม่มีคำขอที่ค้างอยู่")}
      {section("ประวัติการยืมทั้งหมด (ล่าสุด 100 รายการ)", d.history, "ยังไม่มีประวัติ")}
    </div>
  );
}

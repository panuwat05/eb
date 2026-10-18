// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
import Badge from "@/components/Badge";
import ApiButton from "@/components/ApiButton";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import type { SessionUser } from "@/lib/guard";
import { borrowingQuerySchema, BORROWING_STATUSES } from "@/lib/validation";
import { listBorrowings } from "@/lib/services/borrowing";
import { STATUS_LABEL } from "@/lib/rules";
import { fmtDate } from "@/lib/format";

export default async function BorrowingList({ user, raw, base }: { user: SessionUser; raw: Record<string, string | undefined>; base: string }) {
  const parsed = borrowingQuerySchema.safeParse(raw);
  const q = parsed.success ? parsed.data : borrowingQuerySchema.parse({});
  const { items, meta } = await listBorrowings(user, q);
  const admin = user.role === "ADMIN";
  const keep = { search: raw.search, status: raw.status, sort: raw.sort, order: raw.order, dueFrom: raw.dueFrom, dueTo: raw.dueTo };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">{admin ? "รายการยืมทั้งหมด" : "การยืมของฉัน"}</h1>{!admin && <Link className="btn" href="/user/borrowings/new">ขอยืมอุปกรณ์</Link>}</div>
      <form className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input name="search" defaultValue={raw.search} placeholder="รหัส ผู้ยืม หรืออุปกรณ์" aria-label="ค้นหา" className="field lg:col-span-2" />
        <select name="status" defaultValue={raw.status ?? ""} aria-label="สถานะ" className="field"><option value="">ทุกสถานะ</option>{BORROWING_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        <select name="sort" defaultValue={q.sort} aria-label="เรียงตาม" className="field"><option value="requestDate">วันที่ขอ</option><option value="expectedReturnDate">กำหนดคืน</option><option value="borrower">ผู้ยืม</option><option value="status">สถานะ</option></select>
        <label className="text-xs">กำหนดคืนตั้งแต่<input type="date" name="dueFrom" defaultValue={raw.dueFrom} className="field" /></label>
        <label className="text-xs">ถึง<input type="date" name="dueTo" defaultValue={raw.dueTo} className="field" /></label>
        <div className="flex gap-2 self-end"><button className="btn">ค้นหา</button><Link className="btn-ghost" href={base}>ล้างตัวกรอง</Link></div>
      </form>
      <p className="text-sm text-slate-600">พบ {meta.total} รายการ</p>
      <div className="space-y-3">
        {items.map((b) => (
          <article key={b.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2"><Link className="font-semibold underline" href={`${base}/${b.id}`}>{b.borrowingCode}</Link><Badge status={b.displayStatus} /></div>
            <p className="text-sm text-slate-600">ผู้ยืม: {b.borrower.name} · ขอเมื่อ {fmtDate(b.requestDate)} · กำหนดคืน {fmtDate(b.expectedReturnDate)}{b.actualReturnDate && ` · คืนเมื่อ ${fmtDate(b.actualReturnDate)}`}</p>
            <ul className="my-2 text-sm">{b.items.map((i) => <li key={i.id}>{i.equipment.name} ×{i.quantity}{i.quantityIssued > 0 && ` (คืนแล้ว ${i.quantityReturned}/${i.quantityIssued})`}</li>)}</ul>
            {b.rejectionReason && <p className="text-sm text-red-800">เหตุผลที่ไม่อนุมัติ: {b.rejectionReason}</p>}
            <div className="flex flex-wrap gap-2">
              {admin && b.status === "PENDING" && <><ApiButton url={`/api/borrowings/${b.id}/approve`} label="อนุมัติ" /><ApiButton url={`/api/borrowings/${b.id}/reject`} label="ไม่อนุมัติ" promptText="เหตุผลที่ไม่อนุมัติ" promptKey="reason" /></>}
              {admin && b.status === "APPROVED" && <ApiButton url={`/api/borrowings/${b.id}/issue`} label="จ่ายอุปกรณ์" confirmText="ยืนยันการจ่ายอุปกรณ์?" />}
              {admin && b.status === "BORROWED" && <ApiButton url={`/api/borrowings/${b.id}/return`} label="รับคืนทั้งหมด (สภาพดี)" confirmText="ยืนยันรับคืนอุปกรณ์ที่ค้างทั้งหมดในสภาพดี?" body={{ items: b.items.filter((i) => i.quantityIssued > i.quantityReturned).map((i) => ({ itemId: i.id, quantity: i.quantityIssued - i.quantityReturned, condition: "GOOD" })) }} />}
              {admin && b.status === "BORROWED" && <ApiButton url={`/api/borrowings/${b.id}/return`} label="รับคืน (ชำรุด)" confirmText="บันทึกว่าอุปกรณ์ที่ค้างทั้งหมดชำรุด และส่งซ่อมบำรุง?" body={{ items: b.items.filter((i) => i.quantityIssued > i.quantityReturned).map((i) => ({ itemId: i.id, quantity: i.quantityIssued - i.quantityReturned, condition: "DAMAGED" })) }} />}
              {(b.status === "PENDING" || b.status === "APPROVED") && (admin || b.borrowerId === user.id) && <ApiButton danger url={`/api/borrowings/${b.id}`} method="DELETE" label="ยกเลิกคำขอ" confirmText="ยกเลิกคำขอนี้ใช่หรือไม่?" />}
            </div>
          </article>))}
        {items.length === 0 && <p className="card py-8 text-center text-slate-500">ไม่พบรายการยืม</p>}
      </div>
      <Pagination base={base} params={keep} page={meta.page} totalPages={meta.totalPages} />
    </div>
  );
}

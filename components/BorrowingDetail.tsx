// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
import Badge from "@/components/Badge";
import ApiButton from "@/components/ApiButton";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { getBorrowing } from "@/lib/services/borrowing";
import type { SessionUser } from "@/lib/guard";

// getBorrowing() ตรวจสิทธิ์เจ้าของรายการสำหรับผู้ใช้ทั่วไป จึงไม่เปิดเผยรายการของผู้อื่นผ่านการเปลี่ยน URL
export default async function BorrowingDetail({ user, id }: { user: SessionUser; id: string }) {
  const b = await getBorrowing(user, id);
  const admin = user.role === "ADMIN";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">{b.borrowingCode}</h1><Badge status={b.displayStatus} /></div>
      <div className="card space-y-1 text-sm">
        {admin && <p>ผู้ยืม: {b.borrower.name} ({b.borrower.email})</p>}
        <p>วันที่ขอ: {fmtDateTime(b.requestDate)} · กำหนดคืน: {fmtDate(b.expectedReturnDate)}{b.actualReturnDate && ` · คืนเมื่อ ${fmtDate(b.actualReturnDate)}`}</p>
        <p>วัตถุประสงค์: {b.purpose}</p>{b.notes && <p>หมายเหตุ: {b.notes}</p>}
        {b.rejectionReason && <p className="text-red-800">เหตุผลที่ไม่อนุมัติ: {b.rejectionReason}</p>}
      </div>
      <div className="card overflow-x-auto p-0"><table className="w-full"><thead><tr><th className="th">รหัส</th><th className="th">อุปกรณ์</th><th className="th">จำนวน</th><th className="th">คืนแล้ว</th></tr></thead>
        <tbody className="divide-y">{b.items.map((i) => <tr key={i.id}><td className="td">{i.equipment.equipmentCode}</td><td className="td">{i.equipment.name}</td><td className="td">{i.quantity}</td><td className="td">{i.quantityReturned}/{i.quantityIssued}</td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap gap-2">
        {admin && b.status === "PENDING" && <><ApiButton url={`/api/borrowings/${b.id}/approve`} label="อนุมัติ" /><ApiButton url={`/api/borrowings/${b.id}/reject`} label="ไม่อนุมัติ" promptText="เหตุผลที่ไม่อนุมัติ" promptKey="reason" /></>}
        {admin && b.status === "APPROVED" && <ApiButton url={`/api/borrowings/${b.id}/issue`} label="จ่ายอุปกรณ์" confirmText="ยืนยันการจ่ายอุปกรณ์?" />}
        {(b.status === "PENDING" || b.status === "APPROVED") && (admin || b.borrowerId === user.id) && <ApiButton danger url={`/api/borrowings/${b.id}/cancel`} label="ยกเลิกคำขอ" confirmText="ยกเลิกคำขอนี้ใช่หรือไม่?" />}
      </div>
      <section><h2 className="mb-2 font-semibold">ประวัติสถานะ</h2>
        <ul className="card space-y-1 text-sm">{b.events.map((e) => <li key={e.id}>{fmtDateTime(e.createdAt)} · {e.fromStatus ?? "-"} → {e.toStatus}{e.note && ` (${e.note})`}</li>)}</ul></section>
    </div>
  );
}

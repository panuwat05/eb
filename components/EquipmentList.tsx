// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
import Link from "next/link";
import Badge from "@/components/Badge";
import ApiButton from "@/components/ApiButton";
import Pagination from "@/components/Pagination";
import prisma from "@/lib/prisma";
import { equipmentQuerySchema } from "@/lib/validation";
import { listEquipment } from "@/lib/services/equipment";

export default async function EquipmentList({ admin, raw, base }: { admin: boolean; raw: Record<string, string | undefined>; base: string }) {
  const parsed = equipmentQuerySchema.safeParse(raw);
  const q = parsed.success ? parsed.data : equipmentQuerySchema.parse({});
  const [{ items, meta }, cats] = await Promise.all([listEquipment(q), prisma.category.findMany({ orderBy: { name: "asc" } })]);
  const keep = { search: raw.search, categoryId: raw.categoryId, status: raw.status, available: raw.available, sort: raw.sort, order: raw.order };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">อุปกรณ์</h1>{admin && <Link className="btn" href="/admin/equipment/new">เพิ่มอุปกรณ์</Link>}</div>
      <form className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input name="search" defaultValue={raw.search} placeholder="ค้นหารหัสหรือชื่อ" aria-label="ค้นหา" className="field lg:col-span-2" />
        <select name="categoryId" defaultValue={raw.categoryId ?? ""} aria-label="หมวดหมู่" className="field"><option value="">ทุกหมวดหมู่</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="available" defaultValue={raw.available ?? ""} aria-label="ความพร้อม" className="field"><option value="">ทั้งหมด</option><option value="true">พร้อมให้ยืม</option></select>
        <select name="sort" defaultValue={q.sort} aria-label="เรียงตาม" className="field"><option value="createdAt">ใหม่สุด</option><option value="name">ชื่อ</option><option value="equipmentCode">รหัส</option><option value="availableQuantity">จำนวนที่เหลือ</option></select>
        <select name="order" defaultValue={q.order} aria-label="ทิศทาง" className="field"><option value="desc">มากไปน้อย</option><option value="asc">น้อยไปมาก</option></select>
        <div className="flex gap-2"><button className="btn">ค้นหา</button><Link className="btn-ghost" href={base}>ล้างตัวกรอง</Link></div>
      </form>
      <p className="text-sm text-slate-600">พบ {meta.total} รายการ</p>
      <div className="card overflow-x-auto p-0"><table className="w-full"><thead><tr>
        {["รหัส", "ชื่อ", "หมวดหมู่", "ทั้งหมด", "เหลือ", "สถานที่", "สถานะ", admin ? "จัดการ" : "ขอยืม"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y">{items.map((e) => (
          <tr key={e.id}><td className="td">{e.equipmentCode}</td><td className="td font-medium">{e.name}</td><td className="td">{e.category.name}</td><td className="td">{e.totalQuantity}</td><td className="td">{e.availableQuantity}</td><td className="td">{e.location}</td><td className="td"><Badge status={e.status} /></td>
            {!admin && <td className="td">{e.status === "AVAILABLE" && e.availableQuantity > 0 ? <Link className="btn-ghost" href={`/user/borrowings/new?equipmentId=${e.id}`}>ขอยืม</Link> : <span className="text-xs text-slate-500">ไม่พร้อม</span>}</td>}
            {admin && <td className="td"><div className="flex gap-2"><Link className="btn-ghost" href={`/admin/equipment/${e.id}/edit`}>แก้ไข</Link><ApiButton danger url={`/api/equipment/${e.id}`} method="DELETE" label="ลบ" confirmText={`ลบอุปกรณ์ "${e.name}" ใช่หรือไม่?`} /></div></td>}</tr>))}
          {items.length === 0 && <tr><td colSpan={8} className="td py-8 text-center text-slate-500">ไม่พบอุปกรณ์ที่ตรงกับเงื่อนไข</td></tr>}</tbody></table></div>
      <Pagination base={base} params={keep} page={meta.page} totalPages={meta.totalPages} />
    </div>
  );
}

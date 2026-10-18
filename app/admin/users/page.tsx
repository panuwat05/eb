// คำอธิบายไฟล์: หน้าสำหรับ ADMIN เพื่อดูและจัดการข้อมูลตามสิทธิ์ของผู้ดูแลระบบ
import Link from "next/link";
import Pagination from "@/components/Pagination";
import { pageUser } from "@/lib/guard";
import { listUsers } from "@/lib/services/users";
import { userQuerySchema } from "@/lib/validation";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await pageUser(true);
  const raw = await searchParams;
  const parsed = userQuerySchema.safeParse(raw);
  const q = parsed.success ? parsed.data : userQuerySchema.parse({});
  const { items, meta } = await listUsers(q);
  const keep = { search: raw.search, role: raw.role, status: raw.status, sort: raw.sort, order: raw.order };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ผู้ใช้งาน</h1>
      {!parsed.success && <p role="alert" className="rounded bg-amber-50 p-2 text-sm text-amber-900">ตัวกรองบางรายการไม่ถูกต้อง จึงใช้ค่าเริ่มต้น</p>}
      <form className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input name="search" defaultValue={raw.search} placeholder="ชื่อหรืออีเมล" aria-label="ค้นหา" className="field lg:col-span-2" />
        <select name="role" defaultValue={raw.role ?? ""} aria-label="บทบาท" className="field"><option value="">ทุกบทบาท</option><option value="ADMIN">ผู้ดูแล</option><option value="USER">ผู้ใช้</option></select>
        <select name="status" defaultValue={raw.status ?? ""} aria-label="สถานะบัญชี" className="field"><option value="">ทุกสถานะ</option><option value="ACTIVE">ใช้งานอยู่</option><option value="SUSPENDED">ถูกระงับ</option></select>
        <select name="sort" defaultValue={q.sort} aria-label="เรียงตาม" className="field"><option value="createdAt">วันที่สมัคร</option><option value="name">ชื่อ</option><option value="email">อีเมล</option><option value="role">บทบาท</option><option value="status">สถานะ</option></select>
        <div className="flex gap-2"><button className="btn">ค้นหา</button><Link className="btn-ghost" href="/admin/users">ล้าง</Link></div>
      </form>
      <p className="text-sm text-slate-600">พบ {meta.total} บัญชี</p>
      <div className="card overflow-x-auto p-0"><table className="w-full"><thead><tr>{["ชื่อ", "อีเมล", "บทบาท", "สถานะ", "วันที่สมัคร", ""].map((h, i) => <th key={i} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y">{items.map((u) => (
          <tr key={u.id}><td className="td font-medium">{u.name}</td><td className="td">{u.email}</td><td className="td">{u.role === "ADMIN" ? "ผู้ดูแล" : "ผู้ใช้"}</td>
            <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.status === "ACTIVE" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{u.status === "ACTIVE" ? "ใช้งานอยู่" : "ถูกระงับ"}</span></td>
            <td className="td">{fmtDate(u.createdAt)}</td><td className="td"><Link className="btn-ghost" href={`/admin/users/${u.id}`}>ดูรายละเอียด</Link></td></tr>))}
          {items.length === 0 && <tr><td colSpan={6} className="td py-8 text-center text-slate-500">ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข</td></tr>}</tbody></table></div>
      <Pagination base="/admin/users" params={keep} page={meta.page} totalPages={meta.totalPages} />
    </div>
  );
}

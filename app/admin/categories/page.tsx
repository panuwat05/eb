// คำอธิบายไฟล์: หน้าสำหรับ ADMIN เพื่อดูและจัดการข้อมูลตามสิทธิ์ของผู้ดูแลระบบ
import ApiButton from "@/components/ApiButton";
import CategoryForm from "@/components/CategoryForm";
import prisma from "@/lib/prisma";
import { pageUser } from "@/lib/guard";

export const dynamic = "force-dynamic";
export default async function CategoriesPage() {
  await pageUser(true);
  const cats = await prisma.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { equipment: true } } } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">หมวดหมู่อุปกรณ์</h1>
      <CategoryForm />
      <div className="card overflow-x-auto p-0"><table className="w-full"><thead><tr><th className="th">ชื่อ</th><th className="th">รายละเอียด</th><th className="th">จำนวนอุปกรณ์</th><th className="th">จัดการ</th></tr></thead>
        <tbody className="divide-y">{cats.map((c) => (
          <tr key={c.id}><td className="td font-medium">{c.name}</td><td className="td">{c.description ?? "-"}</td><td className="td">{c._count.equipment}</td>
            <td className="td"><ApiButton danger url={`/api/categories/${c.id}`} method="DELETE" label="ลบ" confirmText={`ลบหมวดหมู่ "${c.name}" ใช่หรือไม่?`} /></td></tr>))}
          {cats.length === 0 && <tr><td colSpan={4} className="td py-8 text-center text-slate-500">ยังไม่มีหมวดหมู่ เพิ่มหมวดหมู่แรกด้วยฟอร์มด้านบน</td></tr>}</tbody></table></div>
    </div>
  );
}

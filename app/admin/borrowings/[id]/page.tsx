// คำอธิบายไฟล์: หน้าสำหรับ ADMIN เพื่อดูและจัดการข้อมูลตามสิทธิ์ของผู้ดูแลระบบ
import BorrowingDetail from "@/components/BorrowingDetail";
import ApiButton from "@/components/ApiButton";
import prisma from "@/lib/prisma";
import { pageUser } from "@/lib/guard";
import { idSchema } from "@/lib/validation";
import { AppError } from "@/lib/api";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await pageUser(true);
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const b = await prisma.borrowing.findUnique({ where: { id: id.data }, include: { items: true } });
  if (!b) notFound();
  const outstanding = b.items.filter((i) => i.quantityIssued > i.quantityReturned).map((i) => ({ itemId: i.id, quantity: i.quantityIssued - i.quantityReturned }));
  try {
    return (
      <div className="space-y-4">
        <BorrowingDetail user={user} id={id.data} />
        {b.status === "BORROWED" && (
          <div className="flex flex-wrap gap-2">
            <ApiButton url={`/api/borrowings/${b.id}/return`} label="รับคืนทั้งหมด (สภาพดี)" confirmText="ยืนยันรับคืนอุปกรณ์ที่ค้างทั้งหมดในสภาพดี?" body={{ items: outstanding.map((o) => ({ ...o, condition: "GOOD" })) }} />
            <ApiButton url={`/api/borrowings/${b.id}/return`} label="รับคืน (ชำรุด)" confirmText="บันทึกว่าอุปกรณ์ที่ค้างทั้งหมดชำรุด และส่งซ่อมบำรุง?" body={{ items: outstanding.map((o) => ({ ...o, condition: "DAMAGED" })) }} />
          </div>
        )}
      </div>
    );
  } catch (e) { if (e instanceof AppError && e.status === 404) notFound(); throw e; }
}

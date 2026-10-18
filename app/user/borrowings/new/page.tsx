// คำอธิบายไฟล์: หน้าสำหรับ USER เพื่อดูอุปกรณ์ จัดการคำขอยืมของตนเอง และดูโปรไฟล์
import NewBorrowingForm from "@/components/NewBorrowingForm";
import prisma from "@/lib/prisma";
import { pageRegularUser } from "@/lib/guard";
import { MAX_LOAN_DAYS } from "@/lib/validation";

export const dynamic = "force-dynamic";
export default async function NewBorrowing({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  await pageRegularUser();
  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null, status: "AVAILABLE", availableQuantity: { gt: 0 } }, orderBy: { name: "asc" },
    select: { id: true, equipmentCode: true, name: true, availableQuantity: true },
  });
  const maxDate = new Date(Date.now() + MAX_LOAN_DAYS * 86400000).toISOString().slice(0, 10);
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">ขอยืมอุปกรณ์</h1><NewBorrowingForm equipment={equipment} maxDate={maxDate} preselectId={sp.equipmentId} /></div>);
}

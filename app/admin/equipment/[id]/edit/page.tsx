// คำอธิบายไฟล์: หน้าสำหรับ ADMIN เพื่อดูและจัดการข้อมูลตามสิทธิ์ของผู้ดูแลระบบ
import { notFound } from "next/navigation";
import EquipmentForm from "@/components/EquipmentForm";
import prisma from "@/lib/prisma";
import { pageUser } from "@/lib/guard";

export default async function EditEquipment({ params }: { params: Promise<{ id: string }> }) {
  await pageUser(true);
  const { id } = await params;
  const e = await prisma.equipment.findFirst({ where: { id, deletedAt: null } });
  if (!e) notFound();
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">แก้ไขอุปกรณ์</h1>
    <EquipmentForm id={id} categories={categories} initial={{ equipmentCode: e.equipmentCode, name: e.name, description: e.description ?? "", categoryId: e.categoryId, totalQuantity: String(e.totalQuantity), location: e.location, condition: e.condition, status: e.status, imageUrl: e.imageUrl ?? "" }} /></div>);
}

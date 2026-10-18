// คำอธิบายไฟล์: หน้าสำหรับ ADMIN เพื่อดูและจัดการข้อมูลตามสิทธิ์ของผู้ดูแลระบบ
import EquipmentList from "@/components/EquipmentList";
import { pageUser } from "@/lib/guard";

export const dynamic = "force-dynamic";
export default async function AdminEquipmentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await pageUser(true);
  return <EquipmentList admin raw={await searchParams} base="/admin/equipment" />;
}

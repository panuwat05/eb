// คำอธิบายไฟล์: หน้าสำหรับ USER เพื่อดูอุปกรณ์ จัดการคำขอยืมของตนเอง และดูโปรไฟล์
import EquipmentList from "@/components/EquipmentList";
import { pageRegularUser } from "@/lib/guard";

export const dynamic = "force-dynamic";
export default async function UserEquipmentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await pageRegularUser();
  return <EquipmentList admin={false} raw={await searchParams} base="/user/equipment" />;
}

// คำอธิบายไฟล์: หน้าสำหรับ ADMIN เพื่อดูและจัดการข้อมูลตามสิทธิ์ของผู้ดูแลระบบ
import BorrowingList from "@/components/BorrowingList";
import { pageUser } from "@/lib/guard";

export const dynamic = "force-dynamic";
export default async function AdminBorrowingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await pageUser(true);
  return <BorrowingList user={user} raw={await searchParams} base="/admin/borrowings" />;
}

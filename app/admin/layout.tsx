// คำอธิบายไฟล์: หน้าสำหรับ ADMIN เพื่อดูและจัดการข้อมูลตามสิทธิ์ของผู้ดูแลระบบ
import AppShell from "@/components/AppShell";
import { pageUser } from "@/lib/guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser(true); // หากไม่ใช่ ADMIN จะถูกเปลี่ยนเส้นทางไป /user/home ก่อนแสดงหน้า
  return <AppShell user={user}>{children}</AppShell>;
}

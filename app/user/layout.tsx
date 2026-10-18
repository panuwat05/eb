// คำอธิบายไฟล์: หน้าสำหรับ USER เพื่อดูอุปกรณ์ จัดการคำขอยืมของตนเอง และดูโปรไฟล์
import AppShell from "@/components/AppShell";
import { pageRegularUser } from "@/lib/guard";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await pageRegularUser();
  return <AppShell user={user}>{children}</AppShell>;
}

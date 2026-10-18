// คำอธิบายไฟล์: หน้าสำหรับ USER เพื่อดูอุปกรณ์ จัดการคำขอยืมของตนเอง และดูโปรไฟล์
import ProfileForm from "@/components/ProfileForm";
import { pageRegularUser } from "@/lib/guard";

export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  const user = await pageRegularUser();
  return <div className="space-y-4"><h1 className="text-2xl font-bold">โปรไฟล์ของฉัน</h1><ProfileForm initialName={user.name} email={user.email} /></div>;
}

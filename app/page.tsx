// คำอธิบายไฟล์: หน้าเริ่มต้น ตรวจ session แล้วเปลี่ยนเส้นทางไปยังหน้าแรกตามบทบาทผู้ใช้
import { redirect } from "next/navigation";
import { homeFor, pageUser } from "@/lib/guard";

export const dynamic = "force-dynamic";
export default async function Root() {
  const user = await pageUser();
  redirect(homeFor(user.role));
}

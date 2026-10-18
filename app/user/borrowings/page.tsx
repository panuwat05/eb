// คำอธิบายไฟล์: หน้าสำหรับ USER เพื่อดูอุปกรณ์ จัดการคำขอยืมของตนเอง และดูโปรไฟล์
import BorrowingList from "@/components/BorrowingList";
import { pageRegularUser } from "@/lib/guard";

export const dynamic = "force-dynamic";
export default async function UserBorrowingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await pageRegularUser();
  return <BorrowingList user={user} raw={await searchParams} base="/user/borrowings" />;
}

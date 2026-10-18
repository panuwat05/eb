// คำอธิบายไฟล์: หน้าสำหรับ USER เพื่อดูอุปกรณ์ จัดการคำขอยืมของตนเอง และดูโปรไฟล์
import BorrowingDetail from "@/components/BorrowingDetail";
import { pageRegularUser } from "@/lib/guard";
import { idSchema } from "@/lib/validation";
import { AppError } from "@/lib/api";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await pageRegularUser();
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  try { return <BorrowingDetail user={user} id={id.data} />; } catch (e) { if (e instanceof AppError && e.status === 404) notFound(); throw e; }
}

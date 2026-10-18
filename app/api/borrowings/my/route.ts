// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { ok, route } from "@/lib/api";
import { requireUser } from "@/lib/guard";
import { borrowingQuerySchema, queryObject } from "@/lib/validation";
import { listBorrowings } from "@/lib/services/borrowing";

export const GET = route(async (req) => {
  const user = await requireUser();
  return ok(await listBorrowings(user, borrowingQuerySchema.parse(queryObject(req)), true));
});

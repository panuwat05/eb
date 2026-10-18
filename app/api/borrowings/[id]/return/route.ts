// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { ok, route, parseBody, type IdCtx } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { idSchema, returnSchema } from "@/lib/validation";
import { returnBorrowing } from "@/lib/services/borrowing";

// ให้ ADMIN เป็นผู้บันทึกการคืน เพราะต้องตรวจสภาพอุปกรณ์ที่รับคืนจริง
export const POST = route(async (req, ctx: IdCtx) => {
  const admin = await requireAdmin();
  return ok(await returnBorrowing(admin, idSchema.parse((await ctx.params).id), await parseBody(req, returnSchema)));
});

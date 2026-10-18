// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { ok, route, parseBody, type IdCtx } from "@/lib/api";
import { requireUser } from "@/lib/guard";
import { borrowingUpdateSchema, idSchema } from "@/lib/validation";
import { cancelBorrowing, getBorrowing, updateBorrowing } from "@/lib/services/borrowing";

export const GET = route(async (_r, ctx: IdCtx) => ok(await getBorrowing(await requireUser(), idSchema.parse((await ctx.params).id))));
export const PUT = route(async (req, ctx: IdCtx) => {
  const user = await requireUser();
  return ok(await updateBorrowing(user, idSchema.parse((await ctx.params).id), await parseBody(req, borrowingUpdateSchema)));
});
// DELETE ใช้ยกเลิกคำขอเพื่อเก็บประวัติไว้ ไม่ได้ลบข้อมูลออกจากฐานข้อมูลจริง
export const DELETE = route(async (_r, ctx: IdCtx) => ok(await cancelBorrowing(await requireUser(), idSchema.parse((await ctx.params).id))));

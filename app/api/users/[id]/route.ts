// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { ok, route, parseBody, type IdCtx } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { idSchema, userUpdateSchema } from "@/lib/validation";
import { getUserDetail, updateUser } from "@/lib/services/users";

export const GET = route(async (_r, ctx: IdCtx) => { await requireAdmin(); return ok(await getUserDetail(idSchema.parse((await ctx.params).id))); });
export const PUT = route(async (req, ctx: IdCtx) => {
  const admin = await requireAdmin();
  return ok(await updateUser(idSchema.parse((await ctx.params).id), await parseBody(req, userUpdateSchema), admin.id));
});
// ไม่มี DELETE บัญชีจะถูกระงับแทนการลบ เพื่อรักษาประวัติการทำรายการ

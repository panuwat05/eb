// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { ok, route, parseBody, type IdCtx } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { idSchema, rejectSchema } from "@/lib/validation";
import { rejectBorrowing } from "@/lib/services/borrowing";

export const POST = route(async (req, ctx: IdCtx) => {
  const admin = await requireAdmin();
  const { reason } = await parseBody(req, rejectSchema);
  return ok(await rejectBorrowing(admin, idSchema.parse((await ctx.params).id), reason));
});

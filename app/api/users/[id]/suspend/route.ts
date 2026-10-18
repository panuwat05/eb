// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { AppError, ok, route, parseBody, type IdCtx } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { idSchema, suspendSchema } from "@/lib/validation";
import { suspendUser } from "@/lib/services/users";

export const POST = route(async (req, ctx: IdCtx) => {
  const admin = await requireAdmin();
  const text = await req.text();
  let json: unknown = {};
  if (text) { try { json = JSON.parse(text); } catch { throw new AppError(400, "BAD_JSON", "รูปแบบ JSON ไม่ถูกต้อง"); } }
  const body = suspendSchema.parse(json);
  return ok(await suspendUser(idSchema.parse((await ctx.params).id), admin.id, body.reason));
});

// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { ok, route, parseBody, type IdCtx } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/guard";
import { equipmentSchema, idSchema } from "@/lib/validation";
import { deleteEquipment, getEquipment, updateEquipment } from "@/lib/services/equipment";

export const GET = route(async (_req, ctx: IdCtx) => {
  await requireUser();
  return ok(await getEquipment(idSchema.parse((await ctx.params).id)));
});
export const PUT = route(async (req, ctx: IdCtx) => {
  const admin = await requireAdmin();
  const id = idSchema.parse((await ctx.params).id);
  return ok(await updateEquipment(id, await parseBody(req, equipmentSchema), admin.id));
});
export const DELETE = route(async (_req, ctx: IdCtx) => {
  const admin = await requireAdmin();
  await deleteEquipment(idSchema.parse((await ctx.params).id), admin.id);
  return ok({ deleted: true });
});

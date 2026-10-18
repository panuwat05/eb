// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { ok, route, parseBody } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/guard";
import { equipmentQuerySchema, equipmentSchema, queryObject } from "@/lib/validation";
import { createEquipment, listEquipment } from "@/lib/services/equipment";

export const GET = route(async (req) => {
  await requireUser();
  const r = await listEquipment(equipmentQuerySchema.parse(queryObject(req)));
  return ok({ items: r.items, meta: r.meta });
});
export const POST = route(async (req) => {
  const admin = await requireAdmin();
  return ok(await createEquipment(await parseBody(req, equipmentSchema), admin.id), 201);
});

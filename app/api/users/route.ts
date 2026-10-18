// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { ok, route, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { queryObject, userCreateSchema, userQuerySchema } from "@/lib/validation";
import { createUser, listUsers } from "@/lib/services/users";

export const GET = route(async (req) => { await requireAdmin(); return ok(await listUsers(userQuerySchema.parse(queryObject(req)))); });
export const POST = route(async (req) => {
  const admin = await requireAdmin();
  return ok(await createUser(await parseBody(req, userCreateSchema), admin.id), 201);
});

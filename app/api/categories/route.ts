// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import prisma from "@/lib/prisma";
import { ok, route, parseBody } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/guard";
import { categorySchema } from "@/lib/validation";

export const GET = route(async () => {
  await requireUser();
  return ok(await prisma.category.findMany({ orderBy: { name: "asc" } }));
});
export const POST = route(async (req) => {
  await requireAdmin();
  return ok(await prisma.category.create({ data: await parseBody(req, categorySchema) }), 201);
});

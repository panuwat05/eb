// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import prisma from "@/lib/prisma";
import { AppError, ok, route, parseBody, type IdCtx } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/guard";
import { categorySchema, idSchema } from "@/lib/validation";

const find = async (id: string) => {
  const c = await prisma.category.findUnique({ where: { id } });
  if (!c) throw new AppError(404, "NOT_FOUND", "ไม่พบหมวดหมู่");
  return c;
};
export const GET = route(async (_r, ctx: IdCtx) => { await requireUser(); return ok(await find(idSchema.parse((await ctx.params).id))); });
export const PUT = route(async (req, ctx: IdCtx) => {
  await requireAdmin();
  const id = idSchema.parse((await ctx.params).id);
  await find(id);
  return ok(await prisma.category.update({ where: { id }, data: await parseBody(req, categorySchema) }));
});
export const DELETE = route(async (_r, ctx: IdCtx) => {
  await requireAdmin();
  const id = idSchema.parse((await ctx.params).id);
  await find(id);
  if ((await prisma.equipment.count({ where: { categoryId: id } })) > 0) throw new AppError(409, "IN_USE", "ลบไม่ได้ เพราะมีอุปกรณ์ในหมวดหมู่นี้");
  await prisma.category.delete({ where: { id } });
  return ok({ deleted: true });
});

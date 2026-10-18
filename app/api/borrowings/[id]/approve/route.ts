// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { ok, route, type IdCtx } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { idSchema } from "@/lib/validation";
import { approveBorrowing } from "@/lib/services/borrowing";

export const POST = route(async (_r, ctx: IdCtx) => ok(await approveBorrowing(await requireAdmin(), idSchema.parse((await ctx.params).id))));

// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { ok, route, type IdCtx } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { idSchema } from "@/lib/validation";
import { reactivateUser } from "@/lib/services/users";

export const POST = route(async (_r, ctx: IdCtx) => ok(await reactivateUser(idSchema.parse((await ctx.params).id), (await requireAdmin()).id)));

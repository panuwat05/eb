// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { ok, route, type IdCtx } from "@/lib/api";
import { requireUser } from "@/lib/guard";
import { idSchema } from "@/lib/validation";
import { cancelBorrowing } from "@/lib/services/borrowing";

// อนุญาตเฉพาะเจ้าของรายการหรือ ADMIN โดย service ตรวจเจ้าของอีกครั้ง และยกเลิกได้เฉพาะ PENDING/APPROVED
export const POST = route(async (_r, ctx: IdCtx) => ok(await cancelBorrowing(await requireUser(), idSchema.parse((await ctx.params).id))));

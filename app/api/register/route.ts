// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { AppError, ok, route, parseBody } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { isKkuEmail, KKU_DOMAIN } from "@/lib/domains";
import { rateLimit } from "@/lib/rate-limit";

// สมัครสมาชิกแบบสาธารณะ โดยกำหนด role เป็น USER เสมอและไม่อ่าน role จากคำขอ
export const POST = route(async (req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`register:${ip}`, 5, 60 * 60_000)) throw new AppError(429, "RATE_LIMITED", "สมัครสมาชิกบ่อยเกินไป กรุณาลองใหม่ภายหลัง");
  const data = await parseBody(req, registerSchema);
  // การสมัครด้วยรหัสผ่านยืนยันความเป็นเจ้าของอีเมลไม่ได้ จึงบังคับให้อีเมล KKU ใช้ KKUMail ผ่าน Google
  if (isKkuEmail(data.email)) {
    throw new AppError(422, "USE_KKUMAIL", `อีเมล @${KKU_DOMAIN} ต้องเข้าสู่ระบบด้วยปุ่ม KKUMail`, { email: [`อีเมล @${KKU_DOMAIN} ให้เข้าสู่ระบบด้วย KKUMail`] });
  }
  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    throw new AppError(409, "CONFLICT", "อีเมลนี้ถูกใช้แล้ว", { email: ["อีเมลนี้ถูกใช้แล้ว"] });
  }
  const u = await prisma.user.create({
    data: { name: data.name, email: data.email, role: "USER", passwordHash: await bcrypt.hash(data.password, 12) },
    select: { id: true, name: true, email: true, role: true },
  });
  return ok(u, 201);
});

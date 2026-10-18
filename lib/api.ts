// คำอธิบายไฟล์: ตัวช่วยตอบกลับ API และแปลงข้อผิดพลาดเป็น JSON ที่มีโครงสร้างเดียวกัน
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

export type Fields = Record<string, string[] | undefined>;
// ข้อผิดพลาดที่คาดการณ์ได้ของระบบ เก็บ HTTP status, code และข้อความภาษาไทยไว้ให้ handler แปลงเป็น JSON
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Fields) { super(message); }
}
export type IdCtx = { params: Promise<{ id: string }> };

export const ok = <T,>(data: T, status = 200) => NextResponse.json({ success: true, data }, { status });
export const fail = (status: number, code: string, message: string, fields?: Fields) =>
  NextResponse.json({ success: false, error: { code, message, fields } }, { status });

// อ่าน JSON จาก request แล้วตรวจด้วย schema ที่ผู้เรียกส่งมา; ถ้า JSON เสียหรือข้อมูลไม่ผ่าน schema จะไม่ส่งต่อไป service
export async function parseBody<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try { json = await req.json(); } catch { throw new AppError(400, "BAD_JSON", "รูปแบบ JSON ไม่ถูกต้อง"); }
  return schema.parse(json);
}

// รวมข้อผิดพลาดหลายชนิดให้เป็น response รูปแบบเดียว ไม่ส่งรายละเอียดภายในระบบกลับไปให้ client
function toError(e: unknown): Response {
  if (e instanceof AppError) return fail(e.status, e.code, e.message, e.fields);
  if (e instanceof ZodError) return fail(422, "VALIDATION_ERROR", "ข้อมูลไม่ถูกต้อง", e.flatten().fieldErrors as Fields);
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return fail(409, "CONFLICT", "ข้อมูลซ้ำกับที่มีอยู่แล้ว");
    if (e.code === "P2025") return fail(404, "NOT_FOUND", "ไม่พบข้อมูล");
  }
  console.error("Unhandled error:", e instanceof Error ? e.name : "unknown"); // ไม่บันทึกข้อมูลคำขอหรือ payload ลง log
  return fail(500, "INTERNAL", "เกิดข้อผิดพลาดภายในระบบ");
}

/** ครอบ handler เพื่อตรวจ origin ของคำขอที่เปลี่ยนข้อมูล และแปลงข้อผิดพลาดเป็นรูปแบบเดียวกัน */
// ฟังก์ชันช่วยจัดการผลลัพธ์และข้อผิดพลาดของ API ให้ตอบกลับในรูปแบบเดียวกัน
export function route<C = unknown>(h: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        const origin = req.headers.get("origin");
        if (origin && new URL(origin).host !== req.headers.get("host")) throw new AppError(403, "BAD_ORIGIN", "คำขอไม่ได้รับอนุญาต");
      }
      return await h(req, ctx);
    } catch (e) { return toError(e); }
  };
}

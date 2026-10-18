// คำอธิบายไฟล์: ตรวจ session สถานะบัญชี และสิทธิ์ USER/ADMIN ทั้งในหน้าเว็บและ API
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "./prisma";
import { AppError } from "./api";

export type Role = "ADMIN" | "USER";
export type SessionUser = { id: string; name: string; email: string; role: Role };

export type Current = { user: SessionUser | null; suspended: boolean };
// อ่านผู้ใช้จาก session แล้วตรวจสถานะล่าสุดจากฐานข้อมูล เพื่อให้การระงับบัญชีมีผลแม้มี session เดิม
async function lookup(): Promise<Current> {
  // auth() อ่าน session ปัจจุบัน แต่ session เพียงอย่างเดียวไม่ใช่แหล่งข้อมูลล่าสุดของ role/status
  const s = await auth();
  if (!s?.user?.id) return { user: null, suspended: false };
  // อ่าน role และสถานะจากฐานข้อมูลใหม่ทุกครั้ง เพื่อให้การเปลี่ยนบทบาทหรือระงับบัญชีมีผลกับ session ที่ยังไม่หมดอายุ
  const u = await prisma.user.findUnique({ where: { id: s.user.id }, select: { id: true, name: true, email: true, role: true, status: true } });
  if (!u) return { user: null, suspended: false };
  if (u.status !== "ACTIVE") return { user: null, suspended: true }; // ตรวจจากฐานข้อมูลทุกคำขอ ทำให้ session เดิมใช้ต่อไม่ได้ทันทีเมื่อบัญชีถูกระงับ
  return { user: { id: u.id, name: u.name, email: u.email, role: u.role as Role }, suspended: false };
}
async function current() { return (await lookup()).user; }
// ใช้ใน API: ถ้าไม่มี session หรือบัญชีถูกระงับ ให้หยุดคำขอด้วยข้อผิดพลาดที่เหมาะสม
export async function requireUser(): Promise<SessionUser> {
  const { user, suspended } = await lookup();
  if (suspended) throw new AppError(403, "ACCOUNT_SUSPENDED", "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "กรุณาเข้าสู่ระบบ");
  return user;
}
// ตรวจสิทธิ์ซ้ำฝั่งเซิร์ฟเวอร์ ห้ามพึ่งการซ่อนปุ่มในหน้าเว็บเพียงอย่างเดียว
export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new AppError(403, "FORBIDDEN", "ไม่มีสิทธิ์ดำเนินการ");
  return u;
}
export async function pageUser(adminOnly = false): Promise<SessionUser> {
  const { user, suspended } = await lookup();
  if (suspended) redirect("/login?error=suspended");
  if (!user) redirect("/login");
  if (adminOnly && user.role !== "ADMIN") redirect("/user/home");
  return user;
}
/** ตรวจสิทธิ์หน้า /user และเปลี่ยน ADMIN ไปยัง dashboard ของตนเอง */
export async function pageRegularUser(): Promise<SessionUser> {
  const u = await pageUser();
  if (u.role === "ADMIN") redirect("/admin/dashboard");
  return u;
}
export const homeFor = (role: Role) => (role === "ADMIN" ? "/admin/dashboard" : "/user/home");

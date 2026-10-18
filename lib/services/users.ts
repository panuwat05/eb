// คำอธิบายไฟล์: จัดการบัญชีผู้ใช้ บทบาท การระงับ/เปิดใช้งาน และบันทึก audit log
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../prisma";
import { AppError } from "../api";
import { displayStatus } from "../rules";
import { profileSchema, userCreateSchema, userQuerySchema, userUpdateSchema } from "../validation";

// ไม่ดึง passwordHash มาในข้อมูลที่ส่งกลับหน้าจอ
const select = {
  id: true, name: true, email: true, role: true, status: true,
  suspendedAt: true, suspendedReason: true, createdAt: true, updatedAt: true,
  suspendedBy: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

export async function listUsers(q: z.output<typeof userQuerySchema>) {
  const where: Prisma.UserWhereInput = {
    ...(q.role && { role: q.role }),
    ...(q.status && { status: q.status }),
    ...(q.search && { OR: [{ name: { contains: q.search } }, { email: { contains: q.search } }] }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select, orderBy: { [q.sort]: q.order }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    prisma.user.count({ where }),
  ]);
  return { items, meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) } };
}

export async function getUser(id: string) {
  const u = await prisma.user.findUnique({ where: { id }, select });
  if (!u) throw new AppError(404, "NOT_FOUND", "ไม่พบผู้ใช้");
  return u;
}

/** ข้อมูลสำหรับ ADMIN ประกอบด้วยโปรไฟล์และประวัติการยืม โดยไม่ส่งข้อมูลลับ */
export async function getUserDetail(id: string) {
  const user = await getUser(id);
  const borrowings = await prisma.borrowing.findMany({
    where: { borrowerId: id }, orderBy: { requestDate: "desc" }, take: 100,
    include: { items: { include: { equipment: { select: { name: true, equipmentCode: true } } } } },
  });
  const rows = borrowings.map((b) => ({ ...b, displayStatus: displayStatus(b.status, b.expectedReturnDate) }));
  return {
    user,
    current: rows.filter((b) => b.status === "BORROWED"),
    overdue: rows.filter((b) => b.displayStatus === "OVERDUE"),
    pending: rows.filter((b) => b.status === "PENDING" || b.status === "APPROVED"),
    history: rows,
  };
}

// สร้างบัญชีผู้ใช้ โดย hash รหัสผ่านก่อนบันทึกและกำหนดสิทธิ์ตามกฎของ service
export async function createUser(d: z.output<typeof userCreateSchema>, actorId: string) {
  if (await prisma.user.findUnique({ where: { email: d.email } })) throw new AppError(409, "CONFLICT", "อีเมลนี้ถูกใช้แล้ว", { email: ["อีเมลนี้ถูกใช้แล้ว"] });
  const u = await prisma.user.create({ data: { name: d.name, email: d.email, role: d.role, passwordHash: await bcrypt.hash(d.password, 12) }, select });
  await prisma.auditLog.create({ data: { actorId, targetUserId: u.id, action: "USER_CREATE", entityType: "User", entityId: u.id } });
  return u;
}

/** นับจำนวน ADMIN ที่ยังใช้งานอยู่ โดยไม่นับบัญชี excludeId */
const otherActiveAdmins = (tx: Prisma.TransactionClient, excludeId: string) =>
  tx.user.count({ where: { role: "ADMIN", status: "ACTIVE", NOT: { id: excludeId } } });

// แก้ข้อมูลผู้ใช้ใน transaction พร้อมป้องกันการลดสิทธิ์ตนเองหรือทำให้ไม่มี ADMIN ที่ใช้งานได้เหลืออยู่
export async function updateUser(id: string, d: z.output<typeof userUpdateSchema>, actorId: string) {
  const { password, ...rest } = d;
  await prisma.$transaction(async (tx) => {
    const cur = await tx.user.findUnique({ where: { id }, select: { role: true, status: true } });
    if (!cur) throw new AppError(404, "NOT_FOUND", "ไม่พบผู้ใช้");
    if (rest.role && rest.role !== cur.role) {
      if (id === actorId) throw new AppError(409, "SELF_DEMOTION", "ไม่สามารถเปลี่ยนบทบาทของตนเองได้");
      if (cur.role === "ADMIN" && cur.status === "ACTIVE" && (await otherActiveAdmins(tx, id)) === 0)
        throw new AppError(409, "LAST_ADMIN", "ไม่สามารถลดสิทธิ์ผู้ดูแลที่ใช้งานอยู่คนสุดท้ายได้");
    }
    await tx.user.update({ where: { id }, data: { ...rest, ...(password && { passwordHash: await bcrypt.hash(password, 12) }) } });
    await tx.auditLog.create({ data: { actorId, targetUserId: id, action: "USER_UPDATE", entityType: "User", entityId: id, metadata: JSON.stringify({ fields: Object.keys(d).filter((k) => k !== "password") }) } });
  });
  return getUser(id);
}

// ระงับบัญชีและบันทึกเหตุผล/ผู้ดำเนินการ พร้อมป้องกันการระงับตนเองและ ADMIN คนสุดท้าย
export async function suspendUser(id: string, actorId: string, reason: string | null) {
  if (id === actorId) throw new AppError(409, "SELF_SUSPEND", "ไม่สามารถระงับบัญชีของตนเองได้");
  await prisma.$transaction(async (tx) => {
    const cur = await tx.user.findUnique({ where: { id }, select: { role: true, status: true } });
    if (!cur) throw new AppError(404, "NOT_FOUND", "ไม่พบผู้ใช้");
    if (cur.status === "SUSPENDED") throw new AppError(409, "INVALID_STATE", "บัญชีนี้ถูกระงับอยู่แล้ว");
    if (cur.role === "ADMIN" && (await otherActiveAdmins(tx, id)) === 0)
      throw new AppError(409, "LAST_ADMIN", "ไม่สามารถระงับผู้ดูแลที่ใช้งานอยู่คนสุดท้ายได้");
    // อัปเดตเฉพาะบัญชี ACTIVE เพื่อป้องกันการระงับซ้ำจากการส่งคำขอหลายครั้ง
    const r = await tx.user.updateMany({ where: { id, status: "ACTIVE" }, data: { status: "SUSPENDED", suspendedAt: new Date(), suspendedReason: reason, suspendedById: actorId } });
    if (r.count === 0) throw new AppError(409, "INVALID_STATE", "บัญชีนี้ถูกระงับอยู่แล้ว");
    await tx.auditLog.create({ data: { actorId, targetUserId: id, action: "USER_SUSPEND", entityType: "User", entityId: id, reason } });
  });
  return getUser(id);
}

export async function reactivateUser(id: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const r = await tx.user.updateMany({ where: { id, status: "SUSPENDED" }, data: { status: "ACTIVE" } });
    if (r.count === 0) {
      if (!(await tx.user.findUnique({ where: { id }, select: { id: true } }))) throw new AppError(404, "NOT_FOUND", "ไม่พบผู้ใช้");
      throw new AppError(409, "INVALID_STATE", "บัญชีนี้ไม่ได้ถูกระงับ");
    }
    // เก็บเวลา เหตุผล และผู้ระงับครั้งล่าสุดไว้ ส่วน audit log บันทึกว่าใครเปิดใช้งานอีกครั้งเมื่อใด
    await tx.auditLog.create({ data: { actorId, targetUserId: id, action: "USER_REACTIVATE", entityType: "User", entityId: id } });
  });
  return getUser(id);
}

export async function updateProfile(userId: string, d: z.output<typeof profileSchema>) {
  return prisma.user.update({ where: { id: userId }, data: { name: d.name }, select: { id: true, name: true, email: true, role: true } });
}

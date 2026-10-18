// คำอธิบายไฟล์: จัดการกฎธุรกิจของการยืม ตั้งแต่สร้างคำขอ อนุมัติ จ่าย คืน และบันทึกประวัติ
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../prisma";
import { AppError } from "../api";
import type { SessionUser } from "../guard";
import { displayStatus } from "../rules";
import { borrowingCreateSchema, borrowingQuerySchema, borrowingUpdateSchema, returnSchema } from "../validation";

// Tx คือชนิดของ client ที่ใช้งานภายใน transaction เท่านั้น เพื่อให้คำสั่งทั้งหมดอยู่ในธุรกรรมเดียวกัน
type Tx = Prisma.TransactionClient;
const include = {
  borrower: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true } },
  items: { include: { equipment: { select: { id: true, equipmentCode: true, name: true } } } },
} satisfies Prisma.BorrowingInclude;

// เติม displayStatus สำหรับหน้าจอ โดยคำนวณ OVERDUE จากวันคืน ไม่เปลี่ยนค่า status ที่บันทึกจริงในฐานข้อมูล
const withDerived = <T extends { status: string; expectedReturnDate: Date }>(b: T) =>
  ({ ...b, displayStatus: displayStatus(b.status, b.expectedReturnDate) });
const isAdmin = (u: SessionUser) => u.role === "ADMIN";

// ใช้เมื่อ updateMany ไม่พบแถวที่เปลี่ยนได้: แยกระหว่างไม่พบรายการ/ไม่มีสิทธิ์ กับพบรายการแต่สถานะไม่อนุญาต
async function explainFailure(tx: Tx | typeof prisma, id: string, user?: SessionUser): Promise<never> {
  const b = await tx.borrowing.findUnique({ where: { id }, select: { borrowerId: true } });
  if (!b || (user && !isAdmin(user) && b.borrowerId !== user.id)) throw new AppError(404, "NOT_FOUND", "ไม่พบรายการยืม");
  throw new AppError(409, "INVALID_STATE", "สถานะปัจจุบันไม่อนุญาตให้ดำเนินการนี้");
}
const event = (tx: Tx, borrowingId: string, actorId: string, fromStatus: string | null, toStatus: string, note?: string) =>
  tx.borrowingEvent.create({ data: { borrowingId, actorId, fromStatus, toStatus, note } });
const audit = (tx: Tx, actorId: string, action: string, id: string) =>
  tx.auditLog.create({ data: { actorId, action, entityType: "Borrowing", entityId: id } });

// สร้างคำขอยืมหลังตรวจอุปกรณ์ซ้ำ ความพร้อมใช้งาน และจำนวนคงเหลือ; ขั้นนี้ยังไม่ตัดสต็อก
export async function createBorrowing(user: SessionUser, data: z.output<typeof borrowingCreateSchema>) {
  // แยกรหัสอุปกรณ์ที่ผู้ใช้เลือกไว้ เพื่อตรวจว่ามีการส่งอุปกรณ์ตัวเดิมซ้ำในคำขอหรือไม่
  const ids = data.items.map((i) => i.equipmentId);
  if (new Set(ids).size !== ids.length) throw new AppError(422, "DUPLICATE_ITEM", "เลือกอุปกรณ์ซ้ำกัน", { items: ["เลือกอุปกรณ์ซ้ำกัน"] });
  const eq = await prisma.equipment.findMany({ where: { id: { in: ids }, deletedAt: null } });
  if (eq.length !== ids.length) throw new AppError(422, "INVALID_EQUIPMENT", "ไม่พบอุปกรณ์ที่เลือก", { items: ["ไม่พบอุปกรณ์ที่เลือก"] });
  for (const i of data.items) {
    const e = eq.find((x) => x.id === i.equipmentId)!;
    if (e.status !== "AVAILABLE") throw new AppError(409, "UNAVAILABLE", `${e.name} ไม่พร้อมให้ยืม`);
    if (i.quantity > e.availableQuantity) throw new AppError(409, "INSUFFICIENT_STOCK", `${e.name} เหลือ ${e.availableQuantity} ชิ้น`);
  }
  // สร้างรหัสอ่านง่ายที่มีวันที่และส่วนสุ่ม เพื่อลดโอกาสที่รหัสคำขอจะซ้ำกัน
  const code = `BR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const b = await prisma.borrowing.create({
    data: {
      borrowingCode: code, borrowerId: user.id, purpose: data.purpose, notes: data.notes, expectedReturnDate: data.expectedReturnDate,
      items: { create: data.items.map((i) => ({ equipmentId: i.equipmentId, quantity: i.quantity })) },
      events: { create: [{ actorId: user.id, toStatus: "PENDING" }] },
    },
    include,
  });
  return withDerived(b);
}

export async function getBorrowing(user: SessionUser, id: string) {
  const b = await prisma.borrowing.findFirst({
    where: { id, ...(isAdmin(user) ? {} : { borrowerId: user.id }) },
    include: { ...include, events: { orderBy: { createdAt: "asc" } } },
  });
  if (!b) throw new AppError(404, "NOT_FOUND", "ไม่พบรายการยืม");
  return withDerived(b);
}

// ค้นหาและแบ่งหน้ารายการ โดยบังคับให้ USER เห็นเฉพาะรายการของตนเอง
export async function listBorrowings(user: SessionUser, q: z.output<typeof borrowingQuerySchema>, mineOnly = false) {
  const now = new Date();
  // สะสมเงื่อนไขค้นหาเป็น AND เพื่อให้ตัวกรองหลายตัวทำงานพร้อมกันได้
  const and: Prisma.BorrowingWhereInput[] = [];
  if (!isAdmin(user) || mineOnly) and.push({ borrowerId: user.id });
  else if (q.borrowerId) and.push({ borrowerId: q.borrowerId });
  if (q.status === "OVERDUE") and.push({ status: "BORROWED", expectedReturnDate: { lt: now } });
  else if (q.status) and.push({ status: q.status });
  if (q.search) and.push({ OR: [
    { borrowingCode: { contains: q.search } }, { borrower: { name: { contains: q.search } } },
    { items: { some: { equipment: { OR: [{ name: { contains: q.search } }, { equipmentCode: { contains: q.search } }] } } } },
  ] });
  if (q.equipmentId) and.push({ items: { some: { equipmentId: q.equipmentId } } });
  if (q.categoryId) and.push({ items: { some: { equipment: { categoryId: q.categoryId } } } });
  if (q.requestFrom || q.requestTo) and.push({ requestDate: { gte: q.requestFrom, lte: q.requestTo } });
  if (q.dueFrom || q.dueTo) and.push({ expectedReturnDate: { gte: q.dueFrom, lte: q.dueTo } });
  const where: Prisma.BorrowingWhereInput = { AND: and };
  const orderBy: Prisma.BorrowingOrderByWithRelationInput = q.sort === "borrower" ? { borrower: { name: q.order } } : { [q.sort]: q.order };
  // อ่านข้อมูลหน้าปัจจุบันและนับจำนวนทั้งหมดใน transaction เดียวกัน เพื่อให้ข้อมูล pagination สอดคล้องกันมากขึ้น
  const [rows, total] = await prisma.$transaction([
    prisma.borrowing.findMany({ where, orderBy, skip: (q.page - 1) * q.pageSize, take: q.pageSize, include }),
    prisma.borrowing.count({ where }),
  ]);
  return { items: rows.map(withDerived), meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) } };
}

export async function updateBorrowing(user: SessionUser, id: string, data: z.output<typeof borrowingUpdateSchema>) {
  const r = await prisma.borrowing.updateMany({
    where: { id, status: "PENDING", ...(isAdmin(user) ? {} : { borrowerId: user.id }) }, data,
  });
  if (r.count === 0) await explainFailure(prisma, id, user);
  return getBorrowing(user, id);
}

// ยกเลิกได้เฉพาะคำขอที่ยัง PENDING หรือ APPROVED พร้อมบันทึกเหตุการณ์และ audit log ใน transaction เดียวกัน
export async function cancelBorrowing(user: SessionUser, id: string) {
  await prisma.$transaction(async (tx) => {
    const cur = await tx.borrowing.findUnique({ where: { id }, select: { status: true } });
    const r = await tx.borrowing.updateMany({
      where: { id, status: { in: ["PENDING", "APPROVED"] }, ...(isAdmin(user) ? {} : { borrowerId: user.id }) },
      data: { status: "CANCELLED" },
    });
    if (r.count === 0) await explainFailure(tx, id, user);
    await event(tx, id, user.id, cur?.status ?? null, "CANCELLED");
    await audit(tx, user.id, "BORROWING_CANCEL", id);
  });
  return getBorrowing(user, id);
}

// อนุมัติคำขอที่ยังรออนุมัติ โดยยังไม่เปลี่ยนจำนวนอุปกรณ์ที่พร้อมให้ยืม
export async function approveBorrowing(admin: SessionUser, id: string) {
  await prisma.$transaction(async (tx) => {
    const r = await tx.borrowing.updateMany({ where: { id, status: "PENDING" }, data: { status: "APPROVED", approvedById: admin.id, approvedAt: new Date() } });
    if (r.count === 0) await explainFailure(tx, id);
    await event(tx, id, admin.id, "PENDING", "APPROVED");
    await audit(tx, admin.id, "BORROWING_APPROVE", id);
  });
  return getBorrowing(admin, id);
}

export async function rejectBorrowing(admin: SessionUser, id: string, reason: string) {
  await prisma.$transaction(async (tx) => {
    const r = await tx.borrowing.updateMany({ where: { id, status: "PENDING" }, data: { status: "REJECTED", rejectionReason: reason, approvedById: admin.id, approvedAt: new Date() } });
    if (r.count === 0) await explainFailure(tx, id);
    await event(tx, id, admin.id, "PENDING", "REJECTED", reason);
    await audit(tx, admin.id, "BORROWING_REJECT", id);
  });
  return getBorrowing(admin, id);
}

/** ตัดสต็อกเฉพาะตอนจ่ายอุปกรณ์ โดยตรวจสถานะและปรับจำนวนแบบ atomic ใน transaction เดียวกัน */
// จ่ายอุปกรณ์จริง: เปลี่ยนสถานะและลด availableQuantity ภายใน transaction เพื่อป้องกันตัดสต็อกไม่ครบ
export async function issueBorrowing(admin: SessionUser, id: string) {
  // ใช้ transaction เพราะการเปลี่ยนสถานะ การลดสต็อก และการบันทึกประวัติต้องสำเร็จหรือยกเลิกพร้อมกัน
  await prisma.$transaction(async (tx) => {
    const r = await tx.borrowing.updateMany({ where: { id, status: "APPROVED" }, data: { status: "BORROWED", issuedAt: new Date() } });
    if (r.count === 0) await explainFailure(tx, id);
    const items = await tx.borrowingItem.findMany({ where: { borrowingId: id }, include: { equipment: { select: { name: true, condition: true } } } });
    // ประมวลผลทีละรายการอุปกรณ์ในคำขอ หากรายการใดตัดสต็อกไม่ได้ จะ throw และย้อนกลับทั้ง transaction
    for (const it of items) {
      const s = await tx.equipment.updateMany({
        where: { id: it.equipmentId, deletedAt: null, status: "AVAILABLE", availableQuantity: { gte: it.quantity } },
        data: { availableQuantity: { decrement: it.quantity } },
      });
      if (s.count === 0) throw new AppError(409, "INSUFFICIENT_STOCK", `${it.equipment.name} มีไม่เพียงพอหรือไม่พร้อมให้ยืม`); // หากจำนวนไม่พอ transaction จะย้อนกลับการเปลี่ยนแปลงทั้งหมด
      await tx.borrowingItem.update({ where: { id: it.id }, data: { quantityIssued: it.quantity, conditionAtBorrowing: it.equipment.condition } });
    }
    await event(tx, id, admin.id, "APPROVED", "BORROWED");
    await audit(tx, admin.id, "BORROWING_ISSUE", id);
  });
  return getBorrowing(admin, id);
}

/** รองรับการคืนบางส่วน: ของสภาพดีคืนเข้าสต็อกพร้อมใช้ ส่วนของเสียย้ายไปจำนวนซ่อมบำรุง */
// บันทึกการคืนตามจำนวนและสภาพที่รับคืน; อุปกรณ์เสียจะถูกนับเป็นงานซ่อมแทนการคืนเข้าสต็อกพร้อมใช้
export async function returnBorrowing(admin: SessionUser, id: string, data: z.output<typeof returnSchema>) {
  const ids = data.items.map((i) => i.itemId);
  if (new Set(ids).size !== ids.length) throw new AppError(422, "DUPLICATE_ITEM", "ระบุรายการซ้ำ");
  await prisma.$transaction(async (tx) => {
    const b = await tx.borrowing.findUnique({ where: { id }, include: { items: true } });
    if (!b) throw new AppError(404, "NOT_FOUND", "ไม่พบรายการยืม");
    if (b.status !== "BORROWED") throw new AppError(409, "INVALID_STATE", "รายการนี้ไม่ได้อยู่ในสถานะกำลังยืม");
    // รับคืนได้หลายรายการในครั้งเดียว และแต่ละรายการอาจคืนเพียงบางส่วน
    for (const r of data.items) {
      const it = b.items.find((x) => x.id === r.itemId);
      if (!it) throw new AppError(422, "INVALID_ITEM", "ไม่พบรายการอุปกรณ์ในคำขอนี้");
      if (r.quantity > it.quantityIssued - it.quantityReturned) throw new AppError(409, "OVER_RETURN", "จำนวนคืนเกินจำนวนที่ค้างอยู่");
      const u = await tx.borrowingItem.updateMany({
        where: { id: it.id, quantityReturned: it.quantityReturned }, // ตรวจว่าจำนวนที่คืนยังเป็นค่าเดิม เพื่อป้องกันการส่งคืนซ้ำพร้อมกัน
        data: { quantityReturned: { increment: r.quantity }, conditionAtReturn: r.condition, returnNotes: r.notes },
      });
      if (u.count === 0) throw new AppError(409, "CONFLICT", "รายการถูกอัปเดตแล้ว กรุณาลองใหม่");
      await tx.equipment.update({
        where: { id: it.equipmentId },
        data: r.condition === "GOOD" ? { availableQuantity: { increment: r.quantity } } : { maintenanceQuantity: { increment: r.quantity } },
      });
    }
    // ตรวจจำนวนคืนล่าสุดของทุกรายการก่อนตัดสินใจว่าคำขอคืนครบแล้วหรือยัง
    const after = await tx.borrowingItem.findMany({ where: { borrowingId: id } });
    if (after.every((i) => i.quantityReturned >= i.quantityIssued)) {
      await tx.borrowing.updateMany({ where: { id, status: "BORROWED" }, data: { status: "RETURNED", actualReturnDate: new Date() } });
      await event(tx, id, admin.id, "BORROWED", "RETURNED");
    } else {
      await event(tx, id, admin.id, "BORROWED", "BORROWED", "partial return");
    }
    await audit(tx, admin.id, "BORROWING_RETURN", id);
  });
  return getBorrowing(admin, id);
}

/** สำหรับ ADMIN เท่านั้น ผู้เรียกต้องตรวจสิทธิ์ด้วย requireAdmin()/pageUser(true) ก่อนเสมอ */
export async function dashboardStats() {
  const now = new Date();
  const [equipCount, activeUsers, suspendedUsers, loanItems, pending, overdueRows, recent] = await Promise.all([
    prisma.equipment.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
    prisma.borrowingItem.findMany({ where: { borrowing: { status: "BORROWED" } }, select: { quantityIssued: true, quantityReturned: true } }),
    prisma.borrowing.count({ where: { status: "PENDING" } }),
    prisma.borrowing.findMany({ where: { status: "BORROWED", expectedReturnDate: { lt: now } }, orderBy: { expectedReturnDate: "asc" }, take: 5, include }),
    prisma.borrowing.findMany({ orderBy: { createdAt: "desc" }, take: 5, include }),
  ]);
  const overdueCount = await prisma.borrowing.count({ where: { status: "BORROWED", expectedReturnDate: { lt: now } } });
  return {
    equipmentTypes: equipCount,
    activeUsers,
    suspendedUsers,
    pendingRequests: pending,
    borrowedUnits: loanItems.reduce((s, i) => s + i.quantityIssued - i.quantityReturned, 0),
    overdueBorrowings: overdueCount,
    overdue: overdueRows.map(withDerived),
    recent: recent.map(withDerived),
  };
}

/** ทุกคำขอถูกจำกัดด้วยรหัสผู้ใช้จาก session ฝั่งเซิร์ฟเวอร์ */
export async function userHomeData(userId: string) {
  const mine = { borrowerId: userId };
  const [pending, current, recent, categories] = await Promise.all([
    prisma.borrowing.findMany({ where: { ...mine, status: { in: ["PENDING", "APPROVED"] } }, orderBy: { requestDate: "desc" }, take: 10, include }),
    prisma.borrowing.findMany({ where: { ...mine, status: "BORROWED" }, orderBy: { expectedReturnDate: "asc" }, take: 10, include }),
    prisma.borrowing.findMany({ where: { ...mine, status: { in: ["RETURNED", "REJECTED", "CANCELLED"] } }, orderBy: { updatedAt: "desc" }, take: 5, include }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { equipment: { where: { deletedAt: null, status: "AVAILABLE", availableQuantity: { gt: 0 } } } } } } }),
  ]);
  return { pending: pending.map(withDerived), current: current.map(withDerived), recent: recent.map(withDerived), categories };
}

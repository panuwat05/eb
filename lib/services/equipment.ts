// คำอธิบายไฟล์: จัดการการค้นหา เพิ่ม แก้ไข และปิดอุปกรณ์ รวมถึงคำนวณจำนวนคงเหลือ
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../prisma";
import { AppError } from "../api";
import { equipmentQuerySchema, equipmentSchema } from "../validation";

export type EquipmentInput = z.output<typeof equipmentSchema>;
const meta = (page: number, pageSize: number, total: number) => ({ page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });

// ค้นหา/กรองรายการอุปกรณ์ และแบ่งหน้าเพื่อไม่ต้องโหลดข้อมูลทั้งหมดในครั้งเดียว
export async function listEquipment(q: z.output<typeof equipmentQuerySchema>) {
  // สร้างเงื่อนไขค้นหาเฉพาะตัวกรองที่ผู้ใช้ส่งมา และซ่อนรายการที่ soft delete แล้วเสมอ
  const where: Prisma.EquipmentWhereInput = {
    deletedAt: null,
    ...(q.categoryId && { categoryId: q.categoryId }),
    ...(q.status && { status: q.status }),
    ...(q.condition && { condition: q.condition }),
    ...(q.location && { location: { contains: q.location } }),
    ...(q.available === "true" && { availableQuantity: { gt: 0 }, status: "AVAILABLE" }),
    ...(q.search && { OR: [{ name: { contains: q.search } }, { equipmentCode: { contains: q.search } }] }),
  };
  // ดึงข้อมูลตามหน้าที่ร้องขอพร้อมจำนวนผลลัพธ์ทั้งหมด สำหรับสร้างตัวควบคุมแบ่งหน้า
  const [items, total] = await prisma.$transaction([
    prisma.equipment.findMany({
      where, orderBy: { [q.sort]: q.order }, skip: (q.page - 1) * q.pageSize, take: q.pageSize,
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.equipment.count({ where }),
  ]);
  return { items, meta: meta(q.page, q.pageSize, total) };
}

export async function getEquipment(id: string) {
  const e = await prisma.equipment.findFirst({ where: { id, deletedAt: null }, include: { category: { select: { id: true, name: true } } } });
  if (!e) throw new AppError(404, "NOT_FOUND", "ไม่พบอุปกรณ์");
  return e;
}

async function assertCategory(categoryId: string) {
  if (!(await prisma.category.findUnique({ where: { id: categoryId } }))) {
    throw new AppError(422, "VALIDATION_ERROR", "ไม่พบหมวดหมู่ที่เลือก", { categoryId: ["ไม่พบหมวดหมู่ที่เลือก"] });
  }
}

// เพิ่มอุปกรณ์ใหม่ โดยเริ่ม availableQuantity เท่ากับ totalQuantity แล้วบันทึกผู้กระทำลง audit log
export async function createEquipment(data: EquipmentInput, actorId: string) {
  await assertCategory(data.categoryId);
  if (await prisma.equipment.findUnique({ where: { equipmentCode: data.equipmentCode } })) {
    throw new AppError(409, "CONFLICT", "รหัสอุปกรณ์นี้มีอยู่แล้ว", { equipmentCode: ["รหัสอุปกรณ์นี้มีอยู่แล้ว"] });
  }
  // บันทึกอุปกรณ์และ audit log เป็นงานเดียวกัน หากบันทึกประวัติไม่สำเร็จให้ย้อนกลับการสร้างด้วย
  return prisma.$transaction(async (tx) => {
    const e = await tx.equipment.create({ data: { ...data, availableQuantity: data.totalQuantity } });
    await tx.auditLog.create({ data: { actorId, action: "EQUIPMENT_CREATE", entityType: "Equipment", entityId: e.id } });
    return e;
  });
}

/** จำนวนรวมต้องไม่น้อยกว่าจำนวนที่ถูกยืมอยู่บวกจำนวนซ่อม และคำนวณจำนวนพร้อมใช้ใหม่ */
// คำนวณจำนวนที่ยังถูกยืมและจำนวนซ่อมก่อนแก้ totalQuantity เพื่อไม่ให้จำนวนรวมต่ำกว่าของที่ยังอยู่กับผู้ยืม
export async function updateEquipment(id: string, data: EquipmentInput, actorId: string) {
  await assertCategory(data.categoryId);
  return prisma.$transaction(async (tx) => {
    const cur = await tx.equipment.findFirst({ where: { id, deletedAt: null } });
    if (!cur) throw new AppError(404, "NOT_FOUND", "ไม่พบอุปกรณ์");
    const dup = await tx.equipment.findFirst({ where: { equipmentCode: data.equipmentCode, NOT: { id } } });
    if (dup) throw new AppError(409, "CONFLICT", "รหัสอุปกรณ์นี้มีอยู่แล้ว", { equipmentCode: ["รหัสอุปกรณ์นี้มีอยู่แล้ว"] });
    const out = await tx.borrowingItem.findMany({ where: { equipmentId: id, borrowing: { status: "BORROWED" } }, select: { quantityIssued: true, quantityReturned: true } });
    const borrowedOut = out.reduce((s, i) => s + i.quantityIssued - i.quantityReturned, 0);
    const minTotal = borrowedOut + cur.maintenanceQuantity;
    if (data.totalQuantity < minTotal) {
      throw new AppError(409, "QUANTITY_CONFLICT", `จำนวนรวมต้องไม่น้อยกว่า ${minTotal} (ถูกยืมอยู่และซ่อมบำรุง)`, { totalQuantity: [`ต้องไม่น้อยกว่า ${minTotal}`] });
    }
    const e = await tx.equipment.update({ where: { id }, data: { ...data, availableQuantity: data.totalQuantity - minTotal } });
    await tx.auditLog.create({ data: { actorId, action: "EQUIPMENT_UPDATE", entityType: "Equipment", entityId: id } });
    return e;
  });
}

/** ใช้ soft delete เท่านั้น และไม่อนุญาตให้ปิดรายการเมื่อมีคำขอที่ยังดำเนินการอยู่ */
export async function deleteEquipment(id: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const cur = await tx.equipment.findFirst({ where: { id, deletedAt: null } });
    if (!cur) throw new AppError(404, "NOT_FOUND", "ไม่พบอุปกรณ์");
    const active = await tx.borrowingItem.count({ where: { equipmentId: id, borrowing: { status: { in: ["PENDING", "APPROVED", "BORROWED"] } } } });
    if (active > 0) throw new AppError(409, "IN_USE", "ลบไม่ได้ เพราะมีคำขอยืมที่ยังดำเนินการอยู่");
    await tx.equipment.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
    await tx.auditLog.create({ data: { actorId, action: "EQUIPMENT_DELETE", entityType: "Equipment", entityId: id } });
  });
}

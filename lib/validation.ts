// คำอธิบายไฟล์: กำหนด Zod schema สำหรับตรวจข้อมูลจากฟอร์มและ query string
import { z } from "zod";

// helper สำหรับข้อความบังคับ: ตัดช่องว่างหัวท้าย ปฏิเสธค่าว่าง และจำกัดความยาว
const str = (label: string, max = 100) =>
  z.string({ required_error: `กรุณากรอก${label}`, invalid_type_error: `${label}ไม่ถูกต้อง` })
    .trim().min(1, `กรุณากรอก${label}`).max(max, `${label}ต้องไม่เกิน ${max} ตัวอักษร`);
// helper สำหรับข้อความไม่บังคับ: ยอมรับ null/undefined และแปลงสตริงว่างให้เป็น null เพื่อเก็บข้อมูลให้เป็นรูปแบบเดียวกัน
const optStr = (max: number) =>
  z.string().trim().max(max, `ต้องไม่เกิน ${max} ตัวอักษร`).optional().nullable().transform((v) => v || null);
const opt = <T extends z.ZodTypeAny>(s: T) => z.preprocess((v) => (v === "" || v === null ? undefined : v), s.optional());

export const ROLES = ["ADMIN", "USER"] as const;
export const CONDITIONS = ["GOOD", "FAIR", "DAMAGED"] as const;
export const EQUIPMENT_STATUSES = ["AVAILABLE", "MAINTENANCE", "INACTIVE"] as const;
export const BORROWING_STATUSES = ["PENDING", "APPROVED", "REJECTED", "BORROWED", "RETURNED", "CANCELLED", "OVERDUE"] as const;
export const MAX_LOAN_DAYS = 30;

const email = z.string({ required_error: "กรุณากรอกอีเมล" }).trim().toLowerCase().email("รูปแบบอีเมลไม่ถูกต้อง").max(120);
const password = z.string({ required_error: "กรุณากรอกรหัสผ่าน" }).min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร").max(100);

export const loginSchema = z.object({ email, password: z.string().min(1, "กรุณากรอกรหัสผ่าน").max(100) });

export const categorySchema = z.object({ name: str("ชื่อหมวดหมู่"), description: optStr(300) });

// ใช้ Zod ตรวจสอบและปรับรูปแบบข้อมูลอุปกรณ์ก่อนส่งเข้า service เช่น ตัดช่องว่างและแปลงจำนวนเป็นตัวเลข
export const equipmentSchema = z.object({
  equipmentCode: str("รหัสอุปกรณ์", 30),
  name: str("ชื่ออุปกรณ์"),
  description: optStr(500),
  categoryId: z.string({ required_error: "กรุณาเลือกหมวดหมู่" }).min(1, "กรุณาเลือกหมวดหมู่"),
  totalQuantity: z.coerce.number({ invalid_type_error: "จำนวนต้องเป็นตัวเลข" }).int("จำนวนต้องเป็นจำนวนเต็ม").min(0, "จำนวนต้องไม่ติดลบ").max(100000),
  location: str("สถานที่เก็บ"),
  condition: z.enum(CONDITIONS, { message: "สภาพอุปกรณ์ไม่ถูกต้อง" }).default("GOOD"),
  status: z.enum(EQUIPMENT_STATUSES, { message: "สถานะไม่ถูกต้อง" }).default("AVAILABLE"),
  imageUrl: z.union([z.string().trim().url("URL ไม่ถูกต้อง"), z.literal("")]).optional().transform((v) => v || null),
});

const expectedReturnDate = z.coerce.date({ invalid_type_error: "วันที่ไม่ถูกต้อง", required_error: "กรุณาระบุวันที่คืน" }).refine(
  (d) => d.getTime() > Date.now(), "วันที่คืนต้องเป็นอนาคต",
).refine((d) => d.getTime() <= Date.now() + MAX_LOAN_DAYS * 86400000, `ยืมได้ไม่เกิน ${MAX_LOAN_DAYS} วัน`);

// กำหนดรูปแบบคำขอยืมที่ยอมรับ รวมถึงจำนวนอุปกรณ์และวันกำหนดคืนที่ต้องอยู่ในช่วงที่อนุญาต
export const borrowingCreateSchema = z.object({
  items: z.array(z.object({
    equipmentId: z.string().min(1, "เลือกอุปกรณ์"),
    quantity: z.coerce.number().int("จำนวนต้องเป็นจำนวนเต็ม").min(1, "จำนวนต้องอย่างน้อย 1").max(100),
  })).min(1, "กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการ").max(20),
  expectedReturnDate,
  purpose: str("วัตถุประสงค์", 300),
  notes: optStr(500),
});
export const borrowingUpdateSchema = z.object({ expectedReturnDate, purpose: str("วัตถุประสงค์", 300), notes: optStr(500) }).partial();
export const rejectSchema = z.object({ reason: str("เหตุผล", 300) });
export const returnSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.coerce.number().int().min(1, "จำนวนต้องอย่างน้อย 1"),
    condition: z.enum(["GOOD", "DAMAGED"], { message: "สภาพไม่ถูกต้อง" }),
    notes: optStr(300),
  })).min(1, "ระบุรายการที่คืน"),
});

export const userCreateSchema = z.object({ name: str("ชื่อ"), email, password, role: z.enum(ROLES, { message: "บทบาทไม่ถูกต้อง" }).default("USER") });
export const USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
// ไม่อนุญาตให้แก้สถานะบัญชีผ่านฟอร์มนี้ ต้องใช้คำสั่งระงับหรือเปิดใช้งานโดยเฉพาะ
// ตรวจสอบข้อมูลที่ ADMIN แก้ไขได้ โดยแยกการระงับบัญชีไปใช้ endpoint เฉพาะ
export const userUpdateSchema = z.object({
  name: str("ชื่อ").optional(), email: email.optional(), password: password.optional(),
  role: z.enum(ROLES).optional(),
}).strict();
export const suspendSchema = z.object({ reason: optStr(300) }).strict();
// จำกัดการแก้ไขโปรไฟล์ให้เปลี่ยนได้เฉพาะชื่อ ไม่เปิดช่องให้ส่ง role/status จาก client
export const profileSchema = z.object({ name: str("ชื่อ") }).strict(); // ผู้ใช้แก้ role/status/email ของตนเองไม่ได้

// ค่ามาตรฐานสำหรับการแบ่งหน้า ป้องกัน page ต่ำกว่า 1 และ pageSize ใหญ่เกินไป
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  order: z.enum(["asc", "desc"]).default("desc"),
};
export const equipmentQuerySchema = z.object({
  ...pagination,
  search: opt(z.string().trim().max(100)),
  categoryId: opt(z.string()),
  status: opt(z.enum(EQUIPMENT_STATUSES)),
  condition: opt(z.enum(CONDITIONS)),
  location: opt(z.string().trim().max(100)),
  available: opt(z.enum(["true", "false"])),
  sort: z.enum(["name", "equipmentCode", "createdAt", "totalQuantity", "availableQuantity"]).default("createdAt"),
});
export const borrowingQuerySchema = z.object({
  ...pagination,
  search: opt(z.string().trim().max(100)),
  status: opt(z.enum(BORROWING_STATUSES)),
  borrowerId: opt(z.string()),
  equipmentId: opt(z.string()),
  categoryId: opt(z.string()),
  requestFrom: opt(z.coerce.date()), requestTo: opt(z.coerce.date()),
  dueFrom: opt(z.coerce.date()), dueTo: opt(z.coerce.date()),
  sort: z.enum(["requestDate", "expectedReturnDate", "borrower", "status"]).default("requestDate"),
});
export const userQuerySchema = z.object({
  ...pagination,
  search: opt(z.string().trim().max(100)),
  role: opt(z.enum(ROLES)),
  status: opt(z.enum(USER_STATUSES)),
  sort: z.enum(["name", "email", "role", "status", "createdAt"]).default("createdAt"),
});
export const idSchema = z.string().min(1).max(40);
export const queryObject = (req: Request) => Object.fromEntries(new URL(req.url).searchParams);

export const registerSchema = z.object({
  name: str("ชื่อ"),
  email,
  password,
  confirmPassword: z.string({ required_error: "กรุณายืนยันรหัสผ่าน" }),
}).refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "รหัสผ่านไม่ตรงกัน" });

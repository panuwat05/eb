// คำอธิบายไฟล์: สร้างข้อมูลเริ่มต้นสำหรับการทดลองระบบ เช่น ADMIN และหมวดหมู่
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// เตรียมบัญชี ADMIN เริ่มต้นจาก ADMIN_EMAIL และ ADMIN_PASSWORD; ไม่เขียนรหัสผ่านดิบลงฐานข้อมูล
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) before seeding.");
  }
  // รันซ้ำได้โดยไม่เขียนทับบัญชีผู้ดูแลที่มีอยู่แล้ว
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Administrator", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`Admin ready: ${email}`);

  // สร้างหมวดหมู่เริ่มต้น และไม่สร้างซ้ำหากมีอยู่แล้ว
  const cats = ["คอมพิวเตอร์", "โสตทัศนูปกรณ์", "อุปกรณ์ต่อพ่วง", "อุปกรณ์ห้องปฏิบัติการ", "อุปกรณ์สำนักงาน"];
  const catIds: Record<string, string> = {};
  for (const name of cats) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    catIds[name] = c.id;
  }
  // เพิ่มข้อมูลตัวอย่างเฉพาะเมื่อเปิด SEED_SAMPLE อย่างชัดเจน เหมาะกับฐานข้อมูลสำหรับพัฒนาเท่านั้น
if (process.env.SEED_SAMPLE !== "true" || process.env.NODE_ENV === "production") return;
  const sample = [
    ["NB-001", "โน้ตบุ๊ก Dell Latitude", "คอมพิวเตอร์", 10, "ห้องคอมพิวเตอร์ 1"],
    ["PC-001", "คอมพิวเตอร์ตั้งโต๊ะ", "คอมพิวเตอร์", 5, "ห้องคอมพิวเตอร์ 2"],
    ["PJ-001", "โปรเจคเตอร์ Epson", "โสตทัศนูปกรณ์", 4, "ห้องโสตฯ"],
    ["CB-001", "สาย HDMI 3 เมตร", "อุปกรณ์ต่อพ่วง", 20, "ตู้เก็บของ A"],
    ["KB-001", "คีย์บอร์ด USB", "อุปกรณ์ต่อพ่วง", 15, "ตู้เก็บของ A"],
    ["MS-001", "เมาส์ไร้สาย", "อุปกรณ์ต่อพ่วง", 15, "ตู้เก็บของ A"],
    ["CM-001", "กล้อง DSLR Canon", "โสตทัศนูปกรณ์", 3, "ห้องโสตฯ"],
    ["MC-001", "ไมโครโฟนไร้สาย", "โสตทัศนูปกรณ์", 6, "ห้องโสตฯ"],
    ["LB-001", "กล้องจุลทรรศน์", "อุปกรณ์ห้องปฏิบัติการ", 8, "ห้องปฏิบัติการ 1"],
    ["OF-001", "เครื่องเย็บกระดาษ", "อุปกรณ์สำนักงาน", 5, "ห้องธุรการ"],
  ] as const;
  for (const [code, name, cat, qty, location] of sample) {
    await prisma.equipment.upsert({
      where: { equipmentCode: code },
      update: {},
      create: { equipmentCode: code, name, categoryId: catIds[cat], totalQuantity: qty, availableQuantity: qty, location, description: "[DEV SAMPLE]" },
    });
  }
  const userPw = process.env.SEED_USER_PASSWORD;
  if (userPw && userPw.length >= 8) {
    const user = await prisma.user.upsert({
      where: { email: "user@example.com" },
      update: {},
      create: { email: "user@example.com", name: "ผู้ใช้ตัวอย่าง", role: "USER", passwordHash: await bcrypt.hash(userPw, 12) },
    });
    const eq = await prisma.equipment.findUnique({ where: { equipmentCode: "PJ-001" } });
    const exists = await prisma.borrowing.findUnique({ where: { borrowingCode: "BR-SAMPLE-0001" } });
    if (eq && !exists) {
      await prisma.borrowing.create({
        data: {
          borrowingCode: "BR-SAMPLE-0001", borrowerId: user.id, purpose: "[DEV SAMPLE] ใช้สอนนอกสถานที่",
          expectedReturnDate: new Date(Date.now() + 7 * 86400000),
          items: { create: [{ equipmentId: eq.id, quantity: 1 }] },
          events: { create: [{ actorId: user.id, toStatus: "PENDING" }] },
        },
      });
    }
  }
  console.log("Sample development data ready.");
}

main().finally(() => prisma.$disconnect());

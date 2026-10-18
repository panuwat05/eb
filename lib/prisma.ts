// คำอธิบายไฟล์: สร้าง Prisma Client ที่ใช้ร่วมกันในแอป
import { PrismaClient } from "@prisma/client";
const g = globalThis as unknown as { prisma?: PrismaClient };
const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
export default prisma;

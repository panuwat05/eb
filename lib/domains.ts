// คำอธิบายไฟล์: กำหนดและตรวจสอบโดเมนอีเมลที่ใช้กับการเข้าสู่ระบบของมหาวิทยาลัย
export const KKU_DOMAIN = (process.env.KKU_EMAIL_DOMAIN ?? "kkumail.com").toLowerCase();
export const isKkuEmail = (email: string) => email.trim().toLowerCase().endsWith(`@${KKU_DOMAIN}`);

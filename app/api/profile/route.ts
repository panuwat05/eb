// คำอธิบายไฟล์: API route สำหรับรับ request ตรวจสิทธิ์/ข้อมูล และเรียก service ที่เกี่ยวข้อง
import { ok, route, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/guard";
import { profileSchema } from "@/lib/validation";
import { updateProfile } from "@/lib/services/users";

// ใช้รหัสผู้ใช้จาก session ฝั่งเซิร์ฟเวอร์เท่านั้น และปฏิเสธ role/status/email ที่ส่งมาใน body
export const PATCH = route(async (req) => {
  const user = await requireUser();
  return ok(await updateProfile(user.id, await parseBody(req, profileSchema)));
});

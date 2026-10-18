// คำอธิบายไฟล์: ตั้งค่า Auth.js, Credentials, Google/GitHub OAuth, การตรวจ password hash และการสร้าง session
import { randomBytes } from "crypto";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { KKU_DOMAIN, isKkuEmail } from "@/lib/domains";

// ใช้รหัสข้อผิดพลาดเฉพาะเมื่อผู้ใช้กรอกรหัสผ่านถูกต้องแต่บัญชีถูกระงับ
class SuspendedError extends CredentialsSignin { code = "suspended"; }
// ใช้ hash สำรองเมื่อไม่พบอีเมล เพื่อลดความแตกต่างของเวลาในการตอบกลับที่อาจบอกได้ว่าอีเมลมีอยู่หรือไม่
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer", 12); // ช่วยลดความแตกต่างของเวลาเมื่ออีเมลไม่อยู่ในระบบ
const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const githubEnabled = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

// ตั้งค่า Auth.js: session เป็น JWT อายุ 8 ชั่วโมง และเปิด provider เฉพาะเมื่อมีค่าตั้งค่าครบ
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      // ตรวจข้อมูลด้วย schema และจำกัดจำนวนครั้งเข้าสู่ระบบ ก่อนตรวจ hash ของรหัสผ่าน
      async authorize(raw) {
        // safeParse คืนผลสำเร็จ/ล้มเหลวแทนการ throw ทันที เหมาะกับข้อมูลฟอร์มที่อาจผิดได้
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        if (!rateLimit(`login:${email}`, 5, 60_000)) return null;
        // ค้นหาบัญชีด้วยอีเมลที่ผ่านการ normalize แล้ว จากนั้นเปรียบเทียบกับ password hash ไม่ใช่รหัสผ่านดิบ
        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) return null;
        if (user.status !== "ACTIVE") throw new SuspendedError(); // แจ้งสถานะระงับเมื่อรหัสผ่านถูกต้องแล้วเท่านั้น
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
    ...(googleEnabled
      ? [Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          authorization: { params: { hd: KKU_DOMAIN, prompt: "select_account" } }, // hd เป็นเพียงคำใบ้ในหน้าล็อกอิน การตรวจจริงทำใน callback ด้านล่าง
        })]
      : []),
   ...(githubEnabled
  ? [GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      issuer: "https://github.com/login/oauth",
    })]
  : []),
  ],
  callbacks: {
    // การเข้าสู่ระบบ KKUMail ต้องให้ Google ยืนยันอีเมลและโดเมน Workspace ผ่านค่า hd
    // อีเมลต้องลงท้ายด้วย @KKU_DOMAIN; การเข้าสู่ระบบครั้งแรกสร้างได้เฉพาะ USER พร้อมรหัสผ่านสุ่มที่ใช้เข้าสู่ระบบไม่ได้
    // ตรวจอีเมล/โดเมน Google และจำกัด GitHub ให้ตรงกับบัญชีที่มีอยู่แล้ว ห้าม OAuth สร้าง ADMIN
    // callback นี้เป็นจุดตรวจสิทธิ์ OAuth ก่อนยอมให้เข้าสู่ระบบ ไม่ควรเชื่อค่าจากหน้าจอเพียงอย่างเดียว
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const email = profile?.email?.toLowerCase();
        const hd = (profile as { hd?: string } | undefined)?.hd?.toLowerCase();
        if (!email || profile?.email_verified !== true || !isKkuEmail(email) || hd !== KKU_DOMAIN) return false;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return existing.status === "ACTIVE" ? true : "/login?error=suspended";
        await prisma.user.create({
          data: { email, name: profile?.name ?? email.split("@")[0], role: "USER", passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12) },
        });
        return true;
      }
      if (account?.provider === "github") {
        // GitHub ใช้ได้เฉพาะบัญชีเดิมที่อีเมลตรงกัน และไม่สร้างบัญชีใหม่หรือเพิ่มสิทธิ์
        const email = profile?.email?.toLowerCase();
        if (!email) return false;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (!existing) return false;
        return existing.status === "ACTIVE" ? true : "/login?error=suspended";
      }
      return true;
    },
    // ไม่เก็บ role ใน token โดยตั้งใจ เพราะระบบอ่านสิทธิ์ล่าสุดจากฐานข้อมูลทุกคำขอ
    // เก็บรหัสผู้ใช้จากฐานข้อมูลไว้ใน token; ไม่เก็บ role เพื่อให้ตรวจสิทธิ์ล่าสุดจาก DB
    async jwt({ token, user, account }) {
      if ((account?.provider === "google" || account?.provider === "github") && token.email) {
        const u = await prisma.user.findUnique({ where: { email: token.email.toLowerCase() }, select: { id: true } });
        if (u) token.uid = u.id; // ใช้รหัสผู้ใช้ในฐานข้อมูลของเรา ไม่ใช่รหัส subject ของ Google
      } else if (user?.id) {
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) { if (session.user && token.uid) session.user.id = token.uid as string; return session; },
  },
});

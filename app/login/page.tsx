// คำอธิบายไฟล์: หน้าเข้าสู่ระบบที่แสดงฟอร์มและข้อความตอบกลับการเข้าสู่ระบบ
import LoginForm from "@/components/LoginForm";
import { KKU_DOMAIN } from "@/lib/domains";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const githubEnabled = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
  return <LoginForm googleEnabled={googleEnabled} githubEnabled={githubEnabled} kkuDomain={KKU_DOMAIN} registered={sp.registered === "1"} suspended={sp.error === "suspended"} />;
}

// คำอธิบายไฟล์: หน้าแบบฟอร์มสมัครสมาชิก
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerSchema } from "@/lib/validation";
import ThemeToggle from "@/components/ThemeToggle";

export default function RegisterPage() {
  const router = useRouter();
  const [v, setV] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const Err = ({ k }: { k: string }) => errors[k]?.[0] ? <p role="alert" className="mt-1 text-sm text-red-700">{errors[k]![0]}</p> : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const p = registerSchema.safeParse(v);
    if (!p.success) { setErrors(p.error.flatten().fieldErrors); return; }
    setErrors({}); setBusy(true);
    const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) { setErrors(json?.error?.fields ?? {}); setMsg(json?.error?.message ?? "สมัครสมาชิกไม่สำเร็จ"); return; }
    router.push("/login?registered=1");
  }
  return (
    <main className="auth-background flex min-h-screen items-center justify-center p-4">
      <div className="auth-theme"><ThemeToggle /></div>
      <form onSubmit={submit} className="auth-card space-y-4" noValidate>
        <div className="auth-brand"><span className="brand-mark" aria-hidden="true">EB</span><span><strong>EquipHub</strong><small>ระบบยืม–คืนอุปกรณ์เพื่อการศึกษา</small></span></div>
        <h1>สมัครสมาชิก</h1>
        <p className="text-sm text-slate-600">นักศึกษา มข. ไม่ต้องสมัคร ให้เข้าสู่ระบบด้วยปุ่ม KKUMail ที่หน้าเข้าสู่ระบบ</p>
        {msg && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{msg}</p>}
        <label className="block text-sm font-medium">ชื่อ-นามสกุล<input className="field mt-1" value={v.name} onChange={set("name")} /><Err k="name" /></label>
        <label className="block text-sm font-medium">อีเมล<input type="email" autoComplete="email" className="field mt-1" value={v.email} onChange={set("email")} /><Err k="email" /></label>
        <label className="block text-sm font-medium">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)<input type="password" autoComplete="new-password" className="field mt-1" value={v.password} onChange={set("password")} /><Err k="password" /></label>
        <label className="block text-sm font-medium">ยืนยันรหัสผ่าน<input type="password" autoComplete="new-password" className="field mt-1" value={v.confirmPassword} onChange={set("confirmPassword")} /><Err k="confirmPassword" /></label>
        <button className="btn w-full justify-center" disabled={busy}>{busy ? "กำลังสมัคร..." : "สมัครสมาชิก"}</button>
        <p className="text-center text-sm">มีบัญชีแล้ว? <Link className="underline" href="/login">เข้าสู่ระบบ</Link></p>
      </form>
    </main>
  );
}

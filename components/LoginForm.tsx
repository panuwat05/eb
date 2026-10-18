// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { loginSchema } from "@/lib/validation";
import ThemeToggle from "@/components/ThemeToggle";

const SUSPENDED_MSG = "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ";
export default function LoginForm({ googleEnabled, githubEnabled, kkuDomain, registered, suspended }: { googleEnabled: boolean; githubEnabled: boolean; kkuDomain: string; registered: boolean; suspended?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(suspended ? SUSPENDED_MSG : "");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = loginSchema.safeParse({ email, password });
    if (!p.success) { setError(p.error.issues[0].message); return; }
    setBusy(true); setError("");
    const r = await signIn("credentials", { email: p.data.email, password, redirect: false });
    setBusy(false);
    if (!r || r.error) { setError(r?.code === "suspended" ? SUSPENDED_MSG : "อีเมลหรือรหัสผ่านไม่ถูกต้อง"); return; }
    window.location.href = "/";
  }
  return (
    <main className="auth-background flex min-h-screen items-center justify-center p-4">
      <div className="auth-theme"><ThemeToggle /></div>
      <form onSubmit={submit} className="auth-card space-y-4" noValidate>
        <div className="auth-brand"><span className="brand-mark" aria-hidden="true">EB</span><span><strong>EquipHub</strong><small>ระบบยืม–คืนอุปกรณ์เพื่อการศึกษา</small></span></div>
        <h1>เข้าสู่ระบบ</h1>
        <p className="text-sm">เข้าสู่ระบบเพื่อจัดการและติดตามการยืมอุปกรณ์</p>
        {registered && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-900">สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ</p>}
        {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
        <label className="block text-sm font-medium">อีเมล<input type="email" autoComplete="username" className="field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="block text-sm font-medium">รหัสผ่าน<input type="password" autoComplete="current-password" className="field mt-1" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="btn w-full justify-center" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
        {(googleEnabled || githubEnabled) && (
          <>
            <p className="text-center text-sm text-slate-500">หรือ</p>
            {googleEnabled && <button type="button" className="btn-ghost w-full justify-center" onClick={() => signIn("google", { callbackUrl: "/" })}>เข้าสู่ระบบด้วย KKUMail (@{kkuDomain})</button>}
          {githubEnabled && <button type="button" className="btn-ghost w-full justify-center" onClick={() => signIn("github", { callbackUrl: "/" })}>เข้าสู่ระบบด้วย GitHub</button>}
          </>
        )}
        <p className="text-center text-sm">ยังไม่มีบัญชี? <Link className="underline" href="/register">สมัครสมาชิก</Link></p>
      </form>
    </main>
  );
}

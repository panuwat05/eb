// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: json?.error?.fields?.name?.[0] ?? json?.error?.message ?? "บันทึกไม่สำเร็จ" }); return; }
    setMsg({ ok: true, text: "บันทึกแล้ว" }); router.refresh();
  }
  return (
    <form onSubmit={submit} className="card grid max-w-md gap-3" noValidate>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded p-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
      <label className="block text-sm font-medium">อีเมล<input className="field mt-1 bg-slate-50" value={email} disabled readOnly /></label>
      <label className="block text-sm font-medium">ชื่อ<input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <button className="btn w-fit" disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึก"}</button>
    </form>
  );
}

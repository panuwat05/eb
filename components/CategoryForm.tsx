// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { categorySchema } from "@/lib/validation";

export default function CategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = categorySchema.safeParse({ name, description });
    if (!p.success) { setError(p.error.issues[0].message); return; }
    setBusy(true); setError("");
    const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p.data) });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) { setError(json?.error?.fields?.name?.[0] ?? json?.error?.message ?? "บันทึกไม่สำเร็จ"); return; }
    setName(""); setDescription(""); router.refresh();
  }
  return (
    <form onSubmit={submit} className="card grid max-w-xl gap-3" noValidate>
      {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
      <label className="block text-sm font-medium">ชื่อหมวดหมู่<input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="block text-sm font-medium">รายละเอียด (ถ้ามี)<input className="field mt-1" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <div><button className="btn" disabled={busy}>{busy ? "กำลังบันทึก..." : "เพิ่มหมวดหมู่"}</button></div>
    </form>
  );
}

// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UserStatusActions({ userId, status, isSelf }: { userId: string; status: string; isSelf: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function call(kind: "suspend" | "reactivate") {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/users/${userId}/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: kind === "suspend" ? JSON.stringify({ reason: reason.trim() || undefined }) : undefined });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: json?.error?.message ?? "เกิดข้อผิดพลาด" }); return; }
    setOpen(false); setReason(""); setMsg({ ok: true, text: kind === "suspend" ? "ระงับบัญชีแล้ว" : "เปิดใช้งานบัญชีอีกครั้งแล้ว" });
    router.refresh();
  }
  return (
    <div className="space-y-2">
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded p-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
      {status === "ACTIVE" && !isSelf && !open && <button className="btn-danger" onClick={() => setOpen(true)}>ระงับบัญชี</button>}
      {status === "ACTIVE" && isSelf && <p className="text-sm text-slate-600">ไม่สามารถระงับบัญชีของตนเองได้</p>}
      {open && (
        <div role="dialog" aria-label="ยืนยันการระงับบัญชี" className="card space-y-2">
          <p className="text-sm font-medium">ยืนยันการระงับบัญชีนี้? ผู้ใช้จะเข้าใช้งานไม่ได้ทันที (ประวัติการยืมยังคงอยู่)</p>
          <label className="block text-sm">เหตุผล (ไม่บังคับ)<textarea className="field mt-1" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <div className="flex gap-2"><button className="btn-danger" disabled={busy} onClick={() => call("suspend")}>{busy ? "กำลังดำเนินการ..." : "ยืนยันระงับ"}</button><button className="btn-ghost" onClick={() => setOpen(false)}>ยกเลิก</button></div>
        </div>
      )}
      {status === "SUSPENDED" && <button className="btn" disabled={busy} onClick={() => { if (window.confirm("เปิดใช้งานบัญชีนี้อีกครั้งใช่หรือไม่?")) call("reactivate"); }}>{busy ? "กำลังดำเนินการ..." : "เปิดใช้งานอีกครั้ง"}</button>}
    </div>
  );
}

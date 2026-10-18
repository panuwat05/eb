// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Eq = { id: string; equipmentCode: string; name: string; availableQuantity: number };
export default function NewBorrowingForm({ equipment, maxDate, preselectId }: { equipment: Eq[]; maxDate: string; preselectId?: string }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>(preselectId && equipment.some((e) => e.id === preselectId) ? { [preselectId]: 1 } : {});
  const [date, setDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const items = Object.entries(qty).filter(([, n]) => n > 0).map(([equipmentId, quantity]) => ({ equipmentId, quantity }));
    setBusy(true); setMsg(""); setErrors({});
    const res = await fetch("/api/borrowings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, expectedReturnDate: date ? new Date(date + "T17:00:00+07:00").toISOString() : "", purpose, notes }) });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) { setErrors(json?.error?.fields ?? {}); setMsg(json?.error?.message ?? "ส่งคำขอไม่สำเร็จ"); return; }
    router.push("/user/borrowings"); router.refresh();
  }
  const Err = ({ k }: { k: string }) => errors[k]?.[0] ? <p role="alert" className="mt-1 text-sm text-red-700">{errors[k]![0]}</p> : null;
  return (
    <form onSubmit={submit} className="grid max-w-3xl gap-4" noValidate>
      {msg && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{msg}</p>}
      <fieldset className="card"><legend className="px-1 text-sm font-semibold">เลือกอุปกรณ์</legend>
        {equipment.length === 0 && <p className="text-sm text-slate-600">ขณะนี้ไม่มีอุปกรณ์ที่พร้อมให้ยืม</p>}
        <ul className="divide-y">{equipment.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>{e.name} <span className="text-slate-500">({e.equipmentCode}) เหลือ {e.availableQuantity}</span></span>
            <input aria-label={`จำนวน ${e.name}`} type="number" min={0} max={e.availableQuantity} className="field !w-20" value={qty[e.id] ?? 0} onChange={(ev) => setQty({ ...qty, [e.id]: Number(ev.target.value) })} />
          </li>))}</ul><Err k="items" />
      </fieldset>
      <label className="block text-sm font-medium">วันที่คืน (ไม่เกิน {maxDate})<input type="date" className="field mt-1" value={date} onChange={(e) => setDate(e.target.value)} /><Err k="expectedReturnDate" /></label>
      <label className="block text-sm font-medium">วัตถุประสงค์<input className="field mt-1" value={purpose} onChange={(e) => setPurpose(e.target.value)} /><Err k="purpose" /></label>
      <label className="block text-sm font-medium">หมายเหตุ<textarea className="field mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <div><button className="btn" disabled={busy}>{busy ? "กำลังส่ง..." : "ส่งคำขอยืม"}</button></div>
    </form>
  );
}

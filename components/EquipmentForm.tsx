// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { equipmentSchema, CONDITIONS, EQUIPMENT_STATUSES } from "@/lib/validation";
import { STATUS_LABEL } from "@/lib/rules";

type Cat = { id: string; name: string };
type Values = { equipmentCode: string; name: string; description: string; categoryId: string; totalQuantity: string; location: string; condition: string; status: string; imageUrl: string };
const condLabel: Record<string, string> = { GOOD: "ดี", FAIR: "พอใช้", DAMAGED: "ชำรุด" };

export default function EquipmentForm({ categories, id, initial }: { categories: Cat[]; id?: string; initial?: Partial<Values> }) {
  const router = useRouter();
  const [v, setV] = useState<Values>({ equipmentCode: "", name: "", description: "", categoryId: "", totalQuantity: "1", location: "", condition: "GOOD", status: "AVAILABLE", imageUrl: "", ...initial });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const parsed = equipmentSchema.safeParse(v);
    if (!parsed.success) { setErrors(parsed.error.flatten().fieldErrors); return; }
    setErrors({});
    setBusy(true);
    const res = await fetch(id ? `/api/equipment/${id}` : "/api/equipment", { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) { setErrors(json?.error?.fields ?? {}); setFormError(json?.error?.message ?? "บันทึกไม่สำเร็จ"); return; }
    router.push("/admin/equipment");
    router.refresh();
  }
  const Err = ({ k }: { k: string }) => errors[k]?.[0] ? <p role="alert" className="mt-1 text-sm text-red-700">{errors[k]![0]}</p> : null;
  return (
    <form onSubmit={submit} className="card grid max-w-2xl gap-4" noValidate>
      {formError && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{formError}</p>}
      <label className="block text-sm font-medium">รหัสอุปกรณ์<input className="field mt-1" value={v.equipmentCode} onChange={set("equipmentCode")} /><Err k="equipmentCode" /></label>
      <label className="block text-sm font-medium">ชื่ออุปกรณ์<input className="field mt-1" value={v.name} onChange={set("name")} /><Err k="name" /></label>
      <label className="block text-sm font-medium">หมวดหมู่
        <select className="field mt-1" value={v.categoryId} onChange={set("categoryId")}><option value="">-- เลือก --</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><Err k="categoryId" />{categories.length === 0 && <span className="mt-1 block text-sm text-amber-800">ยังไม่มีหมวดหมู่ <a className="underline" href="/admin/categories">เพิ่มหมวดหมู่ก่อน</a></span>}</label>
      <label className="block text-sm font-medium">จำนวนทั้งหมด<input type="number" min={0} className="field mt-1" value={v.totalQuantity} onChange={set("totalQuantity")} /><Err k="totalQuantity" /></label>
      <label className="block text-sm font-medium">สถานที่เก็บ<input className="field mt-1" value={v.location} onChange={set("location")} /><Err k="location" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">สภาพ<select className="field mt-1" value={v.condition} onChange={set("condition")}>{CONDITIONS.map((c) => <option key={c} value={c}>{condLabel[c]}</option>)}</select></label>
        <label className="block text-sm font-medium">สถานะ<select className="field mt-1" value={v.status} onChange={set("status")}>{EQUIPMENT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
      </div>
      <label className="block text-sm font-medium">รายละเอียด<textarea className="field mt-1" rows={3} value={v.description} onChange={set("description")} /><Err k="description" /></label>
      <label className="block text-sm font-medium">URL รูปภาพ (ถ้ามี)<input className="field mt-1" value={v.imageUrl} onChange={set("imageUrl")} /><Err k="imageUrl" /></label>
      <div className="flex gap-2"><button className="btn" disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึก"}</button><button type="button" className="btn-ghost" onClick={() => router.push("/admin/equipment")}>ยกเลิก</button></div>
    </form>
  );
}

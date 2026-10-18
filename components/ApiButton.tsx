// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { url: string; method?: string; label: string; confirmText?: string; promptText?: string; promptKey?: string; body?: unknown; danger?: boolean };
export default function ApiButton({ url, method = "POST", label, confirmText, promptText, promptKey, body, danger }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    let payload = body;
    if (promptText) {
      const v = window.prompt(promptText);
      if (!v) return;
      payload = { [promptKey ?? "reason"]: v };
    }
    setBusy(true);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) { window.alert(json?.error?.message ?? "เกิดข้อผิดพลาด"); return; }
    router.refresh();
  }
  return <button type="button" onClick={run} disabled={busy} className={danger ? "btn-danger" : "btn-ghost"}>{busy ? "กำลังดำเนินการ..." : label}</button>;
}

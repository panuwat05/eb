// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
import { STATUS_LABEL } from "@/lib/rules";
const tone: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900", APPROVED: "bg-sky-100 text-sky-900", BORROWED: "bg-indigo-100 text-indigo-900",
  RETURNED: "bg-emerald-100 text-emerald-900", REJECTED: "bg-slate-200 text-slate-800", CANCELLED: "bg-slate-200 text-slate-800",
  OVERDUE: "bg-red-100 text-red-900", AVAILABLE: "bg-emerald-100 text-emerald-900", MAINTENANCE: "bg-amber-100 text-amber-900", INACTIVE: "bg-slate-200 text-slate-800",
};
export default function Badge({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[status] ?? "bg-slate-100"}`}>{STATUS_LABEL[status] ?? status}</span>;
}

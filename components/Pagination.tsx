// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
import Link from "next/link";
export default function Pagination({ base, params, page, totalPages }: { base: string; params: Record<string, string | undefined>; page: number; totalPages: number }) {
  const href = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
    u.set("page", String(p));
    return `${base}?${u}`;
  };
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="แบ่งหน้า">
      {page > 1 ? <Link className="btn-ghost" href={href(page - 1)}>ก่อนหน้า</Link> : <span />}
      <span>หน้า {page} / {totalPages}</span>
      {page < totalPages ? <Link className="btn-ghost" href={href(page + 1)}>ถัดไป</Link> : <span />}
    </nav>
  );
}

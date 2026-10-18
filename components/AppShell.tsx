// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
import Link from "next/link";
import { signOut } from "@/auth";
import type { SessionUser } from "@/lib/guard";
import ThemeToggle from "@/components/ThemeToggle";
import AppNav from "@/components/AppNav";
const ADMIN_LINKS: [string, string, string][] = [["/admin/dashboard", "แดชบอร์ด", "▦"], ["/admin/equipment", "อุปกรณ์", "▣"], ["/admin/categories", "หมวดหมู่", "◈"], ["/admin/borrowings", "รายการยืม", "↔"], ["/admin/users", "ผู้ใช้งาน", "♙"]];
const USER_LINKS: [string, string, string][] = [["/user/home", "หน้าหลัก", "⌂"], ["/user/equipment", "อุปกรณ์", "▣"], ["/user/borrowings", "การยืมของฉัน", "↔"], ["/user/borrowings/new", "ขอยืมอุปกรณ์", "+"], ["/user/profile", "โปรไฟล์", "♙"]];
export default function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const links = user.role === "ADMIN" ? ADMIN_LINKS : USER_LINKS;
  return <div className="app-layout">
    <aside className="app-sidebar">
      <Link href={user.role === "ADMIN" ? "/admin/dashboard" : "/user/home"} className="brand-lockup"><span className="brand-mark" aria-hidden="true">EB</span><span className="brand-copy"><strong>Equip<span>Hub</span></strong><small>ระบบยืม–คืนอุปกรณ์</small></span></Link>
      <div className="sidebar-caption">เมนูหลัก</div><AppNav links={links} />
      <div className="sidebar-footer"><div className="user-avatar" aria-hidden="true">{user.name?.trim()?.charAt(0) || "U"}</div><div className="user-summary"><strong>{user.name}</strong><span>{user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}</span></div><form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="signout-button" aria-label="ออกจากระบบ" title="ออกจากระบบ">↗</button></form></div>
    </aside>
    <div className="app-main-wrap"><header className="topbar"><div className="topbar-copy"><span className="eyebrow">EQUIPMENT MANAGEMENT</span><span className="topbar-title">ระบบจัดการอุปกรณ์</span></div><ThemeToggle /></header><main className="app-content">{children}</main><footer className="app-footer">EquipHub <span>•</span> ระบบยืม–คืนอุปกรณ์เพื่อการศึกษา</footer></div>
  </div>;
}

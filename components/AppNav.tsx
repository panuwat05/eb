// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function AppNav({ links }: { links: [string, string, string][] }) {
  const pathname = usePathname();
  const activeHref = links.map(([href]) => href).filter((href) => pathname === href || pathname.startsWith(`${href}/`)).sort((a, b) => b.length - a.length)[0];
  return <nav aria-label="เมนูหลัก" className="app-nav">{links.map(([href, label, symbol]) => {
    const active = activeHref === href;
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`nav-link${active ? " nav-link-active" : ""}`}><span className="nav-symbol" aria-hidden="true">{symbol}</span><span>{label}</span></Link>;
  })}</nav>;
}

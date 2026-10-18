// คำอธิบายไฟล์: React component สำหรับแสดง UI ที่นำกลับมาใช้ซ้ำได้
"use client";
import { useEffect, useState } from "react";
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("eb-theme", next ? "dark" : "light"); } catch { /* เบราว์เซอร์ไม่อนุญาตให้ใช้ localStorage */ }
    setDark(next);
  }
  return <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={dark ? "เปลี่ยนเป็น Light Mode" : "เปลี่ยนเป็น Dark Mode"} title={dark ? "Light Mode" : "Dark Mode"}><span aria-hidden="true">{dark ? "☀" : "☾"}</span><span>{dark ? "Light Mode" : "Dark Mode"}</span></button>;
}

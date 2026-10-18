// คำอธิบายไฟล์: Layout หลักที่ครอบทุกหน้า กำหนดภาษา metadata และโครงสร้าง HTML ร่วมกัน
import "./globals.css";
export const metadata = { title: "EquipHub | ระบบยืม–คืนอุปกรณ์", description: "ระบบจัดการ ยืม และคืนอุปกรณ์เพื่อการศึกษา" };
const themeScript = `try { var t = localStorage.getItem('eb-theme'); if (t === 'dark' || t === 'light') document.documentElement.classList.toggle('dark', t === 'dark'); } catch (e) {}`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="th" suppressHydrationWarning><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap" /><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body>{children}</body></html>;
}

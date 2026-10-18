// คำอธิบายไฟล์: ฟังก์ชันจัดรูปแบบข้อมูลก่อนแสดงผล เช่น วันที่และสถานะ
export const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium" }) : "-";
export const fmtDateTime = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "-";

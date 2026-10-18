// คำอธิบายไฟล์: กำหนดกฎการเปลี่ยนสถานะและคำนวณสถานะ OVERDUE สำหรับการแสดงผล
export type BorrowingStatus = "PENDING" | "APPROVED" | "REJECTED" | "BORROWED" | "RETURNED" | "CANCELLED";

// กำหนดสถานะปลายทางที่อนุญาตจากแต่ละสถานะ การแยกกฎไว้จุดเดียวช่วยให้ทดสอบได้ง่าย
export const TRANSITIONS: Record<BorrowingStatus, BorrowingStatus[]> = {
  PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["BORROWED", "CANCELLED"],
  BORROWED: ["RETURNED"],
  REJECTED: [],
  RETURNED: [],
  CANCELLED: [],
};

// ตรวจสอบว่าสถานะปัจจุบันเปลี่ยนไปยังสถานะใหม่ได้ตามกติกาหรือไม่ ป้องกันการข้ามขั้นตอน
export function canTransition(from: BorrowingStatus, to: BorrowingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** OVERDUE เป็นสถานะคำนวณเฉพาะรายการที่จ่ายอุปกรณ์แล้วและเลยกำหนดคืน */
// คำนวณสถานะเกินกำหนดจากวันที่คืนและสถานะ BORROWED โดยไม่บันทึก OVERDUE ลงฐานข้อมูล
export function isOverdue(status: string, expectedReturnDate: Date, now: Date = new Date()): boolean {
  return status === "BORROWED" && expectedReturnDate.getTime() < now.getTime();
}

// แปลงสถานะจริงให้เป็นสถานะที่เหมาะสำหรับแสดงผลบนหน้าจอ
export function displayStatus(status: string, due: Date, now: Date = new Date()): string {
  return isOverdue(status, due, now) ? "OVERDUE" : status;
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "รออนุมัติ", APPROVED: "อนุมัติแล้ว", REJECTED: "ไม่อนุมัติ", BORROWED: "กำลังยืม",
  RETURNED: "คืนแล้ว", CANCELLED: "ยกเลิก", OVERDUE: "เกินกำหนด",
  AVAILABLE: "พร้อมใช้งาน", MAINTENANCE: "ซ่อมบำรุง", INACTIVE: "ปิดใช้งาน",
};

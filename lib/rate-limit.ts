// คำอธิบายไฟล์: จำกัดจำนวนคำขอในช่วงเวลาหนึ่งด้วยหน่วยความจำของ process
// ตัวจำกัดความถี่แบบเก็บข้อมูลในหน่วยความจำ เหมาะกับเซิร์ฟเวอร์ instance เดียว; หากขยายระบบควรใช้ Redis หรือระบบกลาง
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(key, recent); return false; }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

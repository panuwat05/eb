// คำอธิบายไฟล์: ตั้งค่าการทำงานของ Next.js
import type { NextConfig } from "next";
const config: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }];
  },
};
export default config;

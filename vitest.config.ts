// คำอธิบายไฟล์: ตั้งค่าตัว runner และสภาพแวดล้อมสำหรับ unit tests
import { defineConfig } from "vitest/config";
import path from "path";
export default defineConfig({ resolve: { alias: { "@": path.resolve(__dirname) } }, test: { environment: "node" } });

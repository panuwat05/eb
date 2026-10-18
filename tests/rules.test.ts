// คำอธิบายไฟล์: ทดสอบกฎสถานะและ validation เพื่อยืนยันผลลัพธ์ที่คาดหวัง
import { describe, expect, it } from "vitest";
import { canTransition, displayStatus, isOverdue } from "@/lib/rules";
import { borrowingCreateSchema, equipmentSchema, profileSchema, suspendSchema, userQuerySchema, userUpdateSchema } from "@/lib/validation";

const future = (d: number) => new Date(Date.now() + d * 86400000);
describe("state machine", () => {
  it("allows only defined transitions", () => {
    expect(canTransition("PENDING", "APPROVED")).toBe(true);
    expect(canTransition("PENDING", "BORROWED")).toBe(false);
    expect(canTransition("RETURNED", "BORROWED")).toBe(false);
    expect(canTransition("REJECTED", "APPROVED")).toBe(false);
  });
});
describe("overdue", () => {
  it("is derived from status and due date", () => {
    expect(isOverdue("BORROWED", future(-1))).toBe(true);
    expect(isOverdue("BORROWED", future(1))).toBe(false);
    expect(isOverdue("RETURNED", future(-5))).toBe(false);
    expect(isOverdue("PENDING", future(-5))).toBe(false);
    expect(displayStatus("BORROWED", future(-1))).toBe("OVERDUE");
  });
});
describe("validation", () => {
  const base = { equipmentCode: " NB-1 ", name: "Laptop", categoryId: "c1", totalQuantity: "3", location: "Room 1" };
  it("trims and coerces equipment input", () => {
    const r = equipmentSchema.parse(base);
    expect(r.equipmentCode).toBe("NB-1");
    expect(r.totalQuantity).toBe(3);
  });
  it("rejects bad equipment input", () => {
    expect(equipmentSchema.safeParse({ ...base, name: "   " }).success).toBe(false);
    expect(equipmentSchema.safeParse({ ...base, totalQuantity: -1 }).success).toBe(false);
    expect(equipmentSchema.safeParse({ ...base, totalQuantity: 1.5 }).success).toBe(false);
    expect(equipmentSchema.safeParse({ ...base, condition: "BROKEN" }).success).toBe(false);
    expect(equipmentSchema.safeParse({ ...base, imageUrl: "not a url" }).success).toBe(false);
  });
  it("validates borrowing requests", () => {
    const item = [{ equipmentId: "e1", quantity: 1 }];
    expect(borrowingCreateSchema.safeParse({ items: item, expectedReturnDate: future(3), purpose: "x" }).success).toBe(true);
    expect(borrowingCreateSchema.safeParse({ items: item, expectedReturnDate: future(-1), purpose: "x" }).success).toBe(false);
    expect(borrowingCreateSchema.safeParse({ items: item, expectedReturnDate: future(90), purpose: "x" }).success).toBe(false);
    expect(borrowingCreateSchema.safeParse({ items: [], expectedReturnDate: future(3), purpose: "x" }).success).toBe(false);
  });
});

describe("mass-assignment guards", () => {
  it("profile update rejects role/status/email", () => {
    expect(profileSchema.safeParse({ name: "A" }).success).toBe(true);
    expect(profileSchema.safeParse({ name: "A", role: "ADMIN" }).success).toBe(false);
    expect(profileSchema.safeParse({ name: "A", status: "ACTIVE" }).success).toBe(false);
  });
  it("admin user update cannot set status", () => {
    expect(userUpdateSchema.safeParse({ name: "A", status: "ACTIVE" }).success).toBe(false);
    expect(userUpdateSchema.safeParse({ role: "USER" }).success).toBe(true);
  });
  it("suspend reason is optional and trimmed", () => {
    expect(suspendSchema.parse({}).reason).toBeUndefined();
    expect(suspendSchema.parse({ reason: "  spam " }).reason).toBe("spam");
    expect(suspendSchema.safeParse({ reason: "x".repeat(301) }).success).toBe(false);
  });
});
describe("user list query", () => {
  it("applies defaults and caps page size", () => {
    const q = userQuerySchema.parse({});
    expect(q.page).toBe(1); expect(q.pageSize).toBe(10);
    expect(userQuerySchema.safeParse({ pageSize: "1000" }).success).toBe(false);
    expect(userQuerySchema.safeParse({ status: "DELETED" }).success).toBe(false);
    expect(userQuerySchema.safeParse({ sort: "passwordHash" }).success).toBe(false);
  });
});

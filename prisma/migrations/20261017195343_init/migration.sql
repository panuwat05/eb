-- คำอธิบายไฟล์: คำสั่ง SQL ที่ Prisma ใช้สร้างโครงสร้างฐานข้อมูลตาม migration นี้
-- สร้างตาราง
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "suspendedAt" DATETIME,
    "suspendedReason" TEXT,
    "suspendedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_suspendedById_fkey" FOREIGN KEY ("suspendedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- สร้างตาราง
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- สร้างตาราง
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "availableQuantity" INTEGER NOT NULL,
    "maintenanceQuantity" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "imageUrl" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- สร้างตาราง
CREATE TABLE "Borrowing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "borrowingCode" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "requestDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "issuedAt" DATETIME,
    "expectedReturnDate" DATETIME NOT NULL,
    "actualReturnDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT NOT NULL,
    "notes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Borrowing_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Borrowing_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- สร้างตาราง
CREATE TABLE "BorrowingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "borrowingId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityIssued" INTEGER NOT NULL DEFAULT 0,
    "quantityReturned" INTEGER NOT NULL DEFAULT 0,
    "conditionAtBorrowing" TEXT,
    "conditionAtReturn" TEXT,
    "returnNotes" TEXT,
    CONSTRAINT "BorrowingItem_borrowingId_fkey" FOREIGN KEY ("borrowingId") REFERENCES "Borrowing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BorrowingItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- สร้างตาราง
CREATE TABLE "BorrowingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "borrowingId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BorrowingEvent_borrowingId_fkey" FOREIGN KEY ("borrowingId") REFERENCES "Borrowing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- สร้างตาราง
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "targetUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- สร้างดัชนี
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- สร้างดัชนี
CREATE INDEX "User_status_idx" ON "User"("status");

-- สร้างดัชนี
CREATE INDEX "User_role_idx" ON "User"("role");

-- สร้างดัชนี
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- สร้างดัชนี
CREATE UNIQUE INDEX "Equipment_equipmentCode_key" ON "Equipment"("equipmentCode");

-- สร้างดัชนี
CREATE INDEX "Equipment_name_idx" ON "Equipment"("name");

-- สร้างดัชนี
CREATE INDEX "Equipment_categoryId_idx" ON "Equipment"("categoryId");

-- สร้างดัชนี
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");

-- สร้างดัชนี
CREATE UNIQUE INDEX "Borrowing_borrowingCode_key" ON "Borrowing"("borrowingCode");

-- สร้างดัชนี
CREATE INDEX "Borrowing_status_idx" ON "Borrowing"("status");

-- สร้างดัชนี
CREATE INDEX "Borrowing_borrowerId_idx" ON "Borrowing"("borrowerId");

-- สร้างดัชนี
CREATE INDEX "Borrowing_expectedReturnDate_idx" ON "Borrowing"("expectedReturnDate");

-- สร้างดัชนี
CREATE INDEX "BorrowingItem_equipmentId_idx" ON "BorrowingItem"("equipmentId");

-- สร้างดัชนี
CREATE UNIQUE INDEX "BorrowingItem_borrowingId_equipmentId_key" ON "BorrowingItem"("borrowingId", "equipmentId");

-- สร้างดัชนี
CREATE INDEX "BorrowingEvent_borrowingId_idx" ON "BorrowingEvent"("borrowingId");

-- สร้างดัชนี
CREATE INDEX "AuditLog_targetUserId_idx" ON "AuditLog"("targetUserId");

-- สร้างดัชนี
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

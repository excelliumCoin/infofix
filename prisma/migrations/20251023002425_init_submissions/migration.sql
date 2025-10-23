-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" INTEGER NOT NULL,
    "user" TEXT NOT NULL,
    "action" INTEGER NOT NULL,
    "proofUrl" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "amountWei" TEXT,
    "nonce" TEXT,
    "deadline" TEXT,
    "signature" TEXT
);

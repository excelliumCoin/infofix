-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "taskId" INTEGER NOT NULL,
    "user" TEXT NOT NULL,
    "action" INTEGER NOT NULL,
    "proofUrl" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "amountWei" TEXT,
    "nonce" TEXT,
    "deadline" TEXT,
    "signature" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

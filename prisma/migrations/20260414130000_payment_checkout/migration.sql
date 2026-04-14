-- CreateEnum
CREATE TYPE "PaymentGatewayProvider" AS ENUM ('stripe', 'sslcommerz', 'portwallet', 'bkash', 'nagad', 'rocket');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('visa', 'debit_card', 'credit_card', 'bkash', 'nagad', 'rocket');

-- CreateEnum
CREATE TYPE "PaymentCheckoutStatus" AS ENUM ('pending', 'processing', 'paid', 'failed');

-- AlterTable
ALTER TABLE "Purchase"
ADD COLUMN "checkoutId" TEXT,
ADD COLUMN "gatewayTransactionId" TEXT;

-- CreateTable
CREATE TABLE "PaymentCheckout" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PurchaseType" NOT NULL DEFAULT 'subscription',
    "plan" "PurchasePlan",
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "provider" "PaymentGatewayProvider" NOT NULL,
    "method" "PurchaseMethod" NOT NULL,
    "paymentMethodType" "PaymentMethodType" NOT NULL,
    "cardLast4" TEXT,
    "cardToken" TEXT,
    "walletProvider" TEXT,
    "walletNumberMasked" TEXT,
    "emailReceipt" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT,
    "status" "PaymentCheckoutStatus" NOT NULL DEFAULT 'pending',
    "paymentUrl" TEXT,
    "gatewayRef" TEXT,
    "failedReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAuditLog" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT,
    "transactionId" TEXT,
    "source" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "responseCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCheckout_checkoutId_key" ON "PaymentCheckout"("checkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCheckout_transactionId_key" ON "PaymentCheckout"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentCheckout_userId_createdAt_idx" ON "PaymentCheckout"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentCheckout_status_idx" ON "PaymentCheckout"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCheckout_userId_idempotencyKey_key" ON "PaymentCheckout"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentAuditLog_checkoutId_createdAt_idx" ON "PaymentAuditLog"("checkoutId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAuditLog_transactionId_createdAt_idx" ON "PaymentAuditLog"("transactionId", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentCheckout" ADD CONSTRAINT "PaymentCheckout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAuditLog" ADD CONSTRAINT "PaymentAuditLog_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "PaymentCheckout"("checkoutId") ON DELETE SET NULL ON UPDATE CASCADE;

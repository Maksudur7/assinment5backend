-- Hardening migration
-- 1) one review per user per media (dedupe existing rows first, keeping the newest)
DELETE FROM "Review" r
USING "Review" newer
WHERE r."userId" = newer."userId"
  AND r."mediaId" = newer."mediaId"
  AND (r."createdAt" < newer."createdAt"
       OR (r."createdAt" = newer."createdAt" AND r."id" < newer."id"));

CREATE UNIQUE INDEX "Review_userId_mediaId_key" ON "Review"("userId", "mediaId");

-- 2) DB-backed rate limiter
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");

-- 3) Heartbeat-based viewer presence
CREATE TABLE "MediaViewer" (
    "mediaId" TEXT NOT NULL,
    "viewerKey" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCountedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaViewer_pkey" PRIMARY KEY ("mediaId","viewerKey")
);
CREATE INDEX "MediaViewer_mediaId_lastSeenAt_idx" ON "MediaViewer"("mediaId", "lastSeenAt");

ALTER TABLE "MediaViewer"
  ADD CONSTRAINT "MediaViewer_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

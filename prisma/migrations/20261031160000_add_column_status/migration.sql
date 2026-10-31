-- 专栏审核流程：草稿 DRAFT → 待审核 PENDING → 已发布 PUBLISHED
ALTER TABLE "Column" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT';

CREATE INDEX IF NOT EXISTS "Column_status_idx" ON "Column"("status");

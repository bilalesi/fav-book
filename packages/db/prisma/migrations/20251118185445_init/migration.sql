-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('TWITTER', 'LINKEDIN', 'GENERIC_URL');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'LINK');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL_SUCCESS');

-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ErrorType" AS ENUM ('NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE', 'RATE_LIMIT', 'INVALID_CONTENT', 'AUTHENTICATION_FAILED', 'NOT_FOUND', 'MALFORMED_URL', 'QUOTA_EXCEEDED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WorkflowStep" AS ENUM ('CONTENT_RETRIEVAL', 'SUMMARIZATION', 'MEDIA_DETECTION', 'MEDIA_DOWNLOAD', 'STORAGE_UPLOAD', 'DATABASE_UPDATE');

-- CreateTable
CREATE TABLE "user" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "preferences" JSONB,

    CONSTRAINT "user_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "session" (
    "_id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "account" (
    "_id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "verification" (
    "_id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "bookmark_post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "postId" TEXT NOT NULL,
    "postUrl" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorUsername" TEXT NOT NULL,
    "authorProfileUrl" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "bookmark_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmark_enrichment" (
    "id" TEXT NOT NULL,
    "bookmarkPostId" TEXT NOT NULL,
    "summary" TEXT,
    "keywords" JSONB,
    "tags" JSONB,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "workflowId" TEXT,
    "errorMessage" TEXT,
    "enrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookmark_enrichment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "bookmarkPostId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "metadata" JSONB,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "downloaded_media" (
    "id" TEXT NOT NULL,
    "bookmarkPostId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "storageUrl" TEXT,
    "fileSize" BIGINT NOT NULL,
    "duration" INTEGER,
    "quality" TEXT,
    "format" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "downloadStatus" "DownloadStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "downloaded_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmark_post_collection" (
    "bookmarkPostId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmark_post_collection_pkey" PRIMARY KEY ("bookmarkPostId","collectionId")
);

-- CreateTable
CREATE TABLE "bookmark_post_category" (
    "bookmarkPostId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmark_post_category_pkey" PRIMARY KEY ("bookmarkPostId","categoryId")
);

-- CreateTable
CREATE TABLE "workflow_error_log" (
    "id" TEXT NOT NULL,
    "bookmarkPostId" TEXT NOT NULL,
    "workflowId" TEXT,
    "step" "WorkflowStep" NOT NULL,
    "errorType" "ErrorType" NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "stackTrace" TEXT,
    "retryable" BOOLEAN NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "context" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "workflow_error_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_metrics" (
    "id" TEXT NOT NULL,
    "bookmarkPostId" TEXT NOT NULL,
    "workflowId" TEXT,
    "step" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "memoryUsedBytes" BIGINT,
    "tokensUsed" INTEGER,
    "success" BOOLEAN NOT NULL,
    "errorType" TEXT,
    "metadata" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "bookmark_post_userId_savedAt_idx" ON "bookmark_post"("userId", "savedAt");

-- CreateIndex
CREATE INDEX "bookmark_post_platform_idx" ON "bookmark_post"("platform");

-- CreateIndex
CREATE INDEX "bookmark_post_authorUsername_idx" ON "bookmark_post"("authorUsername");

-- CreateIndex
CREATE INDEX "bookmark_post_createdAt_idx" ON "bookmark_post"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bookmark_post_userId_platform_postId_key" ON "bookmark_post"("userId", "platform", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "bookmark_enrichment_bookmarkPostId_key" ON "bookmark_enrichment"("bookmarkPostId");

-- CreateIndex
CREATE INDEX "bookmark_enrichment_processingStatus_idx" ON "bookmark_enrichment"("processingStatus");

-- CreateIndex
CREATE INDEX "bookmark_enrichment_enrichedAt_idx" ON "bookmark_enrichment"("enrichedAt");

-- CreateIndex
CREATE INDEX "media_bookmarkPostId_idx" ON "media"("bookmarkPostId");

-- CreateIndex
CREATE INDEX "downloaded_media_bookmarkPostId_idx" ON "downloaded_media"("bookmarkPostId");

-- CreateIndex
CREATE INDEX "downloaded_media_downloadStatus_idx" ON "downloaded_media"("downloadStatus");

-- CreateIndex
CREATE INDEX "collection_userId_idx" ON "collection"("userId");

-- CreateIndex
CREATE INDEX "category_userId_idx" ON "category"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "category_name_userId_key" ON "category"("name", "userId");

-- CreateIndex
CREATE INDEX "workflow_error_log_bookmarkPostId_idx" ON "workflow_error_log"("bookmarkPostId");

-- CreateIndex
CREATE INDEX "workflow_error_log_workflowId_idx" ON "workflow_error_log"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_error_log_step_idx" ON "workflow_error_log"("step");

-- CreateIndex
CREATE INDEX "workflow_error_log_errorType_idx" ON "workflow_error_log"("errorType");

-- CreateIndex
CREATE INDEX "workflow_error_log_resolved_idx" ON "workflow_error_log"("resolved");

-- CreateIndex
CREATE INDEX "workflow_error_log_occurredAt_idx" ON "workflow_error_log"("occurredAt");

-- CreateIndex
CREATE INDEX "workflow_metrics_bookmarkPostId_idx" ON "workflow_metrics"("bookmarkPostId");

-- CreateIndex
CREATE INDEX "workflow_metrics_workflowId_idx" ON "workflow_metrics"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_metrics_step_idx" ON "workflow_metrics"("step");

-- CreateIndex
CREATE INDEX "workflow_metrics_operation_idx" ON "workflow_metrics"("operation");

-- CreateIndex
CREATE INDEX "workflow_metrics_recordedAt_idx" ON "workflow_metrics"("recordedAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark_post" ADD CONSTRAINT "bookmark_post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark_enrichment" ADD CONSTRAINT "bookmark_enrichment_bookmarkPostId_fkey" FOREIGN KEY ("bookmarkPostId") REFERENCES "bookmark_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_bookmarkPostId_fkey" FOREIGN KEY ("bookmarkPostId") REFERENCES "bookmark_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloaded_media" ADD CONSTRAINT "downloaded_media_bookmarkPostId_fkey" FOREIGN KEY ("bookmarkPostId") REFERENCES "bookmark_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection" ADD CONSTRAINT "collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark_post_collection" ADD CONSTRAINT "bookmark_post_collection_bookmarkPostId_fkey" FOREIGN KEY ("bookmarkPostId") REFERENCES "bookmark_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark_post_collection" ADD CONSTRAINT "bookmark_post_collection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark_post_category" ADD CONSTRAINT "bookmark_post_category_bookmarkPostId_fkey" FOREIGN KEY ("bookmarkPostId") REFERENCES "bookmark_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark_post_category" ADD CONSTRAINT "bookmark_post_category_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

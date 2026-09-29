-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CoreRole" AS ENUM ('STUDENT', 'ALUMNI', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('LOST', 'FOUND');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('SEARCHING', 'FOUND', 'RETURNED');

-- CreateEnum
CREATE TYPE "ItemUrgency" AS ENUM ('NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'AT_OFFICE', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "core_user_id" TEXT,
    "core_role" "CoreRole",
    "student_code" TEXT,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "faculty" TEXT NOT NULL DEFAULT '',
    "building" TEXT NOT NULL DEFAULT '',
    "room" TEXT NOT NULL,
    "incident_date" DATE NOT NULL,
    "incident_time" TEXT NOT NULL DEFAULT '',
    "status" "ItemStatus" NOT NULL,
    "urgency" "ItemUrgency" NOT NULL DEFAULT 'NORMAL',
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pin_lat" DOUBLE PRECISION,
    "pin_lng" DOUBLE PRECISION,
    "secret_question" TEXT,
    "secret_answer" TEXT,
    "reporter_id" UUID NOT NULL,
    "reporter_name" TEXT NOT NULL,
    "reporter_student_code" TEXT,
    "reporter_phone" TEXT NOT NULL,
    "reporter_contact" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "item_id" UUID NOT NULL,
    "claimant_id" UUID NOT NULL,
    "linked_item_id" UUID,
    "claim_type" "ReportType" NOT NULL,
    "claimant_name" TEXT NOT NULL,
    "claimant_student_code" TEXT,
    "claimant_affiliation" TEXT NOT NULL,
    "meet_at" TIMESTAMPTZ(3) NOT NULL,
    "meet_location" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "secret_answer_given" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "handover_code" TEXT,
    "pickup_code" TEXT,
    "approved_at" TIMESTAMPTZ(3),
    "dropped_off_at" TIMESTAMPTZ(3),
    "handed_over_at" TIMESTAMPTZ(3),
    "handed_over_by" TEXT,
    "giver_confirmed_at" TIMESTAMPTZ(3),
    "receiver_confirmed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secret_attempts" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "secret_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_core_user_id_key" ON "members"("core_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_student_code_key" ON "members"("student_code");

-- CreateIndex
CREATE INDEX "members_role_idx" ON "members"("role");

-- CreateIndex
CREATE UNIQUE INDEX "items_code_key" ON "items"("code");

-- CreateIndex
CREATE INDEX "items_status_idx" ON "items"("status");

-- CreateIndex
CREATE INDEX "items_report_type_idx" ON "items"("report_type");

-- CreateIndex
CREATE INDEX "items_reporter_id_idx" ON "items"("reporter_id");

-- CreateIndex
CREATE INDEX "items_created_at_idx" ON "items"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "claims_code_key" ON "claims"("code");

-- CreateIndex
CREATE INDEX "claims_item_id_idx" ON "claims"("item_id");

-- CreateIndex
CREATE INDEX "claims_claimant_id_idx" ON "claims"("claimant_id");

-- CreateIndex
CREATE INDEX "claims_linked_item_id_idx" ON "claims"("linked_item_id");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX "claims_created_at_idx" ON "claims"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "claims_active_claimant_key" ON "claims"("item_id", "claimant_id") WHERE (status = ANY (ARRAY['PENDING'::"ClaimStatus", 'APPROVED'::"ClaimStatus", 'AT_OFFICE'::"ClaimStatus"]));

-- CreateIndex
CREATE INDEX "secret_attempts_member_id_idx" ON "secret_attempts"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "secret_attempts_item_id_member_id_key" ON "secret_attempts"("item_id", "member_id");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_claimant_id_fkey" FOREIGN KEY ("claimant_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_linked_item_id_fkey" FOREIGN KEY ("linked_item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_attempts" ADD CONSTRAINT "secret_attempts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_attempts" ADD CONSTRAINT "secret_attempts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

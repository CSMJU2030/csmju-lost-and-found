-- CreateTable
CREATE TABLE "item_images" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "content" BYTEA NOT NULL,
    "uploaded_by_core_user_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_images_item_id_position_idx" ON "item_images"("item_id", "position");

-- AddForeignKey
ALTER TABLE "item_images" ADD CONSTRAINT "item_images_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

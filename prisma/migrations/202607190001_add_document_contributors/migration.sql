CREATE TABLE "document_contributors" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_contributors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_contributors_document_id_user_id_key"
    ON "document_contributors"("document_id", "user_id");

ALTER TABLE "document_contributors"
    ADD CONSTRAINT "document_contributors_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_contributors"
    ADD CONSTRAINT "document_contributors_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

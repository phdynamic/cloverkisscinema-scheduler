-- AlterTable
ALTER TABLE "Post" ADD COLUMN "reviewedByDid" TEXT;
ALTER TABLE "Post" ADD COLUMN "reviewedByHandle" TEXT;
ALTER TABLE "Post" ADD COLUMN "reviewedByName" TEXT;
ALTER TABLE "Post" ADD COLUMN "submittedByDid" TEXT;
ALTER TABLE "Post" ADD COLUMN "submittedByHandle" TEXT;
ALTER TABLE "Post" ADD COLUMN "submittedByName" TEXT;

-- Back-fill: copy author/approver details onto posts whose user still exists.
UPDATE "Post" SET
  "submittedByDid"    = (SELECT "did"         FROM "User" WHERE "User"."id" = "Post"."submittedById"),
  "submittedByHandle" = (SELECT "handle"      FROM "User" WHERE "User"."id" = "Post"."submittedById"),
  "submittedByName"   = (SELECT "displayName" FROM "User" WHERE "User"."id" = "Post"."submittedById")
WHERE "submittedById" IS NOT NULL;

UPDATE "Post" SET
  "reviewedByDid"    = (SELECT "did"         FROM "User" WHERE "User"."id" = "Post"."reviewedById"),
  "reviewedByHandle" = (SELECT "handle"      FROM "User" WHERE "User"."id" = "Post"."reviewedById"),
  "reviewedByName"   = (SELECT "displayName" FROM "User" WHERE "User"."id" = "Post"."reviewedById")
WHERE "reviewedById" IS NOT NULL;

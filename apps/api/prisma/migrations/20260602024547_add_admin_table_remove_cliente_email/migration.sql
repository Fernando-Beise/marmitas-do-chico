/*
  Warnings:

  - You are about to drop the column `email` on the `clientes` table. All the data in the column will be lost.
  - You are about to drop the column `senhaHash` on the `clientes` table. All the data in the column will be lost.
  - You are about to drop the column `temConta` on the `clientes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "clientes" DROP COLUMN "email",
DROP COLUMN "senhaHash",
DROP COLUMN "temConta";

-- CreateTable
CREATE TABLE "admin" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_email_key" ON "admin"("email");

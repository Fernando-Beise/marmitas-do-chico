/*
  Warnings:

  - You are about to drop the column `descricao` on the `enderecos` table. All the data in the column will be lost.
  - You are about to drop the column `enderecoCompleto` on the `enderecos` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `enderecos` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `enderecos` table. All the data in the column will be lost.
  - You are about to drop the column `principal` on the `enderecos` table. All the data in the column will be lost.
  - Added the required column `bairro` to the `enderecos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cep` to the `enderecos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cidade` to the `enderecos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estado` to the `enderecos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numero` to the `enderecos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rua` to the `enderecos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "enderecos" DROP COLUMN "descricao",
DROP COLUMN "enderecoCompleto",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "principal",
ADD COLUMN     "bairro" TEXT NOT NULL,
ADD COLUMN     "cep" TEXT NOT NULL,
ADD COLUMN     "cidade" TEXT NOT NULL,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "estado" TEXT NOT NULL,
ADD COLUMN     "numero" TEXT NOT NULL,
ADD COLUMN     "rua" TEXT NOT NULL;

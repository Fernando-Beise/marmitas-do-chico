/*
  Warnings:

  - You are about to drop the `contatos_whatsapp` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "recebeNotificacoes" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "contatos_whatsapp";

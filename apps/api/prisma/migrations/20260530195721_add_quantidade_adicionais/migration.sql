/*
  Warnings:

  - You are about to drop the `_ItemPedidoAdicionais` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ItemPedidoAdicionais" DROP CONSTRAINT "_ItemPedidoAdicionais_A_fkey";

-- DropForeignKey
ALTER TABLE "_ItemPedidoAdicionais" DROP CONSTRAINT "_ItemPedidoAdicionais_B_fkey";

-- DropTable
DROP TABLE "_ItemPedidoAdicionais";

-- CreateTable
CREATE TABLE "ItemPedidoAdicional" (
    "id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "precoCobrado" DOUBLE PRECISION NOT NULL,
    "itemPedidoId" TEXT NOT NULL,
    "adicionalId" TEXT NOT NULL,

    CONSTRAINT "ItemPedidoAdicional_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ItemPedidoAdicional" ADD CONSTRAINT "ItemPedidoAdicional_itemPedidoId_fkey" FOREIGN KEY ("itemPedidoId") REFERENCES "itens_pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedidoAdicional" ADD CONSTRAINT "ItemPedidoAdicional_adicionalId_fkey" FOREIGN KEY ("adicionalId") REFERENCES "adicionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

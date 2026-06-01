-- CreateTable
CREATE TABLE "adicionais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adicionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PratoAdicionais" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ItemPedidoAdicionais" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_PratoAdicionais_AB_unique" ON "_PratoAdicionais"("A", "B");

-- CreateIndex
CREATE INDEX "_PratoAdicionais_B_index" ON "_PratoAdicionais"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ItemPedidoAdicionais_AB_unique" ON "_ItemPedidoAdicionais"("A", "B");

-- CreateIndex
CREATE INDEX "_ItemPedidoAdicionais_B_index" ON "_ItemPedidoAdicionais"("B");

-- AddForeignKey
ALTER TABLE "_PratoAdicionais" ADD CONSTRAINT "_PratoAdicionais_A_fkey" FOREIGN KEY ("A") REFERENCES "adicionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PratoAdicionais" ADD CONSTRAINT "_PratoAdicionais_B_fkey" FOREIGN KEY ("B") REFERENCES "pratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemPedidoAdicionais" ADD CONSTRAINT "_ItemPedidoAdicionais_A_fkey" FOREIGN KEY ("A") REFERENCES "adicionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemPedidoAdicionais" ADD CONSTRAINT "_ItemPedidoAdicionais_B_fkey" FOREIGN KEY ("B") REFERENCES "itens_pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "loja" (
    "id" TEXT NOT NULL DEFAULT 'padrao',
    "aberta" BOOLEAN NOT NULL DEFAULT false,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loja_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_settings" (
  "id" TEXT NOT NULL DEFAULT 'main',
  "business_name" TEXT NOT NULL DEFAULT 'La Yeka',
  "whatsapp" TEXT NOT NULL DEFAULT '51974121550',
  "address" TEXT NOT NULL DEFAULT 'Calle Mariscal Benavides 150, Chincha Alta',
  "district" TEXT NOT NULL DEFAULT 'Chincha Alta',
  "opening_hours" TEXT NOT NULL DEFAULT 'Todos los días · 6:00 p. m. a 11:00 p. m.',
  "delivery_note" TEXT NOT NULL DEFAULT 'Confirma cobertura y tiempo de entrega por WhatsApp.',
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "store_settings" ("id") VALUES ('main') ON CONFLICT ("id") DO NOTHING;

-- A completed delivery/pickup must be distinguishable from an order merely ready.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';

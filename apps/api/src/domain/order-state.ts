export const orderStatuses = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatusValue = (typeof orderStatuses)[number];

// Mirrors the operational flow already exposed by the admin next-action controls.
const allowedTransitions: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const canTransitionOrder = (from: OrderStatusValue, to: OrderStatusValue) =>
  allowedTransitions[from].includes(to);

export const nextOrderStatuses = (from: OrderStatusValue) => allowedTransitions[from];

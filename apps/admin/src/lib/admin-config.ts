export const api = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
export const brandLogo = '/images/logo-la-yeka-v2.png';

export const labels: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmado', PREPARING: 'En preparación', READY: 'Listo', CANCELLED: 'Cancelado',
  RECEIVED: 'Recibido', IN_REVIEW: 'En revisión', RESOLVED: 'Resuelto', COMPLAINT: 'Reclamo', SERVICE_ISSUE: 'Queja',
  DELIVERY: 'Delivery', PICKUP: 'Recojo en local', CASH: 'Efectivo', YAPE: 'Yape',
};

export const statusOptions = {
  orders: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'CANCELLED'],
  claims: ['RECEIVED', 'IN_REVIEW', 'RESOLVED'],
};

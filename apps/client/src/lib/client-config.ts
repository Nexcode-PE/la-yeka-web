import type { Product } from '../types/catalog';
export const featuredNames = [
  'La Yekaburger Full',
  'La Mixta Full',
  'Fileteada Hawaiana',
  'Salchiyeka Full',
];
export const money = (amount: number) => `S/ ${amount.toFixed(2)}`;
export const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '51974121550';
export const apiBase =
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');
export const productVisual = (product: Product) => product.imagePath || null;

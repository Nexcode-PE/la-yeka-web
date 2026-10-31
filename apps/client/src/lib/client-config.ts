import type { Product } from '../types/catalog';

export const extras = [
  { name: 'Jamón', price: 2 }, { name: 'Queso', price: 3 }, { name: 'Huevo', price: 3 },
  { name: 'Tocino', price: 3 }, { name: 'Plátano', price: 3 }, { name: 'Piña', price: 3 },
];
export const featuredNames = ['La Yekaburger Full', 'La Mixta Full', 'Fileteada Hawaiana', 'Salchiyeka Full'];
export const money = (amount: number) => `S/ ${amount.toFixed(2)}`;
export const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '51974121550';
export const apiBase = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');
export const productVisual = (product: Product) => product.imagePath || null;

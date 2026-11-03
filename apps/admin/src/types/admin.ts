export type Product = {
  id: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  price: string;
  isAvailable: boolean;
  category: { id: string; name: string } | null;
};

export type Category = {
  id: string;
  name: string;
  position: number;
  isAvailable: boolean;
  _count?: { products: number };
};

export type Order = {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  total: string;
  status: string;
  createdAt: string;
  fulfillment: 'DELIVERY' | 'PICKUP';
  paymentMethod: 'CASH' | 'YAPE';
  address: string | null;
  district: string | null;
  items: Array<{ productName: string; quantity: number }>;
};

export type Claim = {
  id: string;
  customerName: string;
  document: string;
  email: string;
  phone: string;
  kind: string;
  orderReference: string | null;
  detail: string;
  requestedSolution: string;
  status: string;
  adminResponse: string | null;
  respondedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type Dashboard = {
  range: 'today' | 'week' | 'month';
  sales: number;
  orders: number;
  averageTicket: number;
  pending: number;
  totalProducts: number;
  availableProducts: number;
  recentOrders: Order[];
  paymentBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
};

export type StoreSettings = {
  id: string;
  businessName: string;
  whatsapp: string;
  address: string;
  district: string;
  openingHours: string;
  deliveryNote: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
  admin: { name: string | null; email: string } | null;
};

export type AdminAlert = {
  id: string;
  kind: 'ORDER' | 'CLAIM' | 'CATALOG';
  title: string;
  description: string;
  createdAt: string;
  view: 'orders' | 'claims' | 'products';
};

export type View = 'dashboard' | 'products' | 'orders' | 'claims' | 'settings' | 'team' | 'audit';

export type Product = {
  id: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  price: string;
  isAvailable: boolean;
  category: { id: string; name: string } | null;
};

export type Category = { id: string; name: string; position: number };

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
  email: string;
  kind: string;
  detail: string;
  status: string;
  createdAt: string;
};

export type Dashboard = {
  salesToday: number;
  ordersToday: number;
  pending: number;
  totalProducts: number;
  availableProducts: number;
  recentOrders: Order[];
  paymentBreakdown: Record<string, number>;
};

export type View = 'dashboard' | 'products' | 'orders' | 'claims';

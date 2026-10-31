export type Product = { id?: string; name: string; detail: string; price: number; category: string; tag?: string; imagePath?: string | null };
export type CartItem = Product & { qty: number };
export type OrderHistory = { id: string; total: string; status: string; createdAt: string; items: Array<{ productName: string; quantity: number }> };

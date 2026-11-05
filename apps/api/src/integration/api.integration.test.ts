import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

const databaseUrl = process.env.DATABASE_URL || '';
const isDedicatedTestDatabase = (() => {
  try {
    const url = new URL(databaseUrl);
    return (
      ['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname.includes('la_yeka_test')
    );
  } catch {
    return false;
  }
})();

if (!isDedicatedTestDatabase) {
  test(
    'API integration suite requires the dedicated la_yeka_test database',
    { skip: true },
    () => {},
  );
} else {
  const [{ db }, { default: app }, { signSession }, argon2] = await Promise.all([
    import('../../../../packages/database/src/client.js'),
    import('../app.js'),
    import('../auth.js'),
    import('argon2'),
  ]);

  let adminToken = '';
  let productId = '';

  const request = (path: string, init: RequestInit = {}) =>
    app.request(`http://test.local/api${path}`, init);
  const adminHeaders = () => ({
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  });

  before(async () => {
    await db.orderStatusEvent.deleteMany();
    await db.orderItem.deleteMany();
    await db.order.deleteMany();
    await db.cashShift.deleteMany();
    await db.auditLog.deleteMany();
    await db.claim.deleteMany();
    await db.product.deleteMany();
    await db.category.deleteMany();
    await db.user.deleteMany();

    const admin = await db.user.create({
      data: {
        name: 'Integration Admin',
        email: 'admin.integration@example.test',
        passwordHash: await argon2.hash('integration-password-123'),
        role: 'ADMIN',
      },
    });
    adminToken = await signSession({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      deliveryAddress: admin.deliveryAddress,
      district: admin.district,
      role: 'ADMIN',
    });
    const category = await db.category.create({ data: { name: 'Integration', position: 0 } });
    const product = await db.product.create({
      data: { name: 'Producto de prueba', price: 12, categoryId: category.id },
    });
    productId = product.id;
  });

  after(async () => {
    await db.$disconnect();
  });

  test('rejects administrative access without a session', async () => {
    const response = await request('/admin/orders');
    assert.equal(response.status, 401);
  });

  test('never serves a payment proof without an administrative session', async () => {
    const response = await request('/admin/orders/not-a-real-order/payment-proof');
    assert.equal(response.status, 401);
  });

  test('creates an order using the server-side product price', async () => {
    const response = await request('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Cliente Integración',
        customerPhone: '999111222',
        fulfillment: 'PICKUP',
        paymentMethod: 'CASH',
        items: [{ productId, quantity: 2 }],
      }),
    });
    assert.equal(response.status, 201);
    const order = (await response.json()) as { id: string; total: number };
    assert.equal(Number(order.total), 24);
  });

  test('enforces sequential order transitions and cash-shift uniqueness', async () => {
    const order = await db.order.findFirstOrThrow({ orderBy: { createdAt: 'desc' } });
    const skipped = await request(`/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: adminHeaders(),
      body: JSON.stringify({ status: 'DELIVERED' }),
    });
    assert.equal(skipped.status, 409);

    const confirmed = await request(`/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: adminHeaders(),
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    assert.equal(confirmed.status, 200);

    const firstShift = await request('/admin/cash-shifts', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ openingAmount: 20 }),
    });
    assert.equal(firstShift.status, 201);
    const secondShift = await request('/admin/cash-shifts', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ openingAmount: 20 }),
    });
    assert.equal(secondShift.status, 409);
  });
}

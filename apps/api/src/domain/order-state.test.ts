import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransitionOrder, nextOrderStatuses } from './order-state.js';

test('allows the normal order lifecycle and cancellation before completion', () => {
  assert.equal(canTransitionOrder('PENDING', 'CONFIRMED'), true);
  assert.equal(canTransitionOrder('CONFIRMED', 'PREPARING'), true);
  assert.equal(canTransitionOrder('PREPARING', 'READY'), true);
  assert.equal(canTransitionOrder('READY', 'DELIVERED'), true);
  assert.equal(canTransitionOrder('PREPARING', 'CANCELLED'), true);
});

test('rejects skipped and terminal-state transitions', () => {
  assert.equal(canTransitionOrder('PENDING', 'DELIVERED'), false);
  assert.equal(canTransitionOrder('DELIVERED', 'READY'), false);
  assert.equal(canTransitionOrder('CANCELLED', 'CONFIRMED'), false);
  assert.deepEqual(nextOrderStatuses('READY'), ['DELIVERED', 'CANCELLED']);
});

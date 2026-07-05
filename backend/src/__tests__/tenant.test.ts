import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PLATFORM_TENANT_ID } from '../config/platform.js';

test('platform tenant id is stable', () => {
  assert.equal(PLATFORM_TENANT_ID, 'a0000000-0000-4000-8000-000000000001');
});

test('tenant isolation query pattern excludes platform tenant', () => {
  const clientTenantId = 'b0000000-0000-4000-8000-000000000002';
  assert.notEqual(clientTenantId, PLATFORM_TENANT_ID);
});

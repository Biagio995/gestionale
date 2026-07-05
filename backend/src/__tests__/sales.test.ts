import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../app.js';
import { pool } from '../db/pool.js';

const app = createApp();

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

async function registerTenant(name: string, email: string) {
  const res = await request(app)
    .post('/auth/register')
    .send({ email, password: 'password123', tenantName: name, language: 'it' });
  assert.equal(res.status, 201);
  return res.body as { token: string; user: { id: string; tenant_id: string } };
}

describe('sales document flow', () => {
  before(async () => {
    await pool.query('SELECT 1');
  });

  test('quote → order → delivery note → invoice', async () => {
    const session = await registerTenant('Sales Co', uniqueEmail('sales-flow'));

    const quoteRes = await request(app)
      .post('/sales/quotes')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        customerName: 'Mario Rossi',
        customerCompanyName: 'Rossi SRL',
        customerVatNumber: 'IT12345678903',
        customerSdiCode: 'ABCDEF1',
        lines: [{ description: 'Consulenza', quantity: 2, unitPrice: 100, taxRate: 22 }],
      });
    assert.equal(quoteRes.status, 201);
    const quoteId = quoteRes.body.id as string;
    assert.match(quoteRes.body.document_number, /^PRV-/);

    const orderRes = await request(app)
      .post(`/sales/quotes/${quoteId}/convert-to-order`)
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(orderRes.status, 201);
    const orderId = orderRes.body.id as string;
    assert.match(orderRes.body.document_number, /^ORD-/);

    const ddtRes = await request(app)
      .post(`/sales/orders/${orderId}/convert-to-delivery-note`)
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(ddtRes.status, 201);
    const ddtId = ddtRes.body.id as string;
    assert.match(ddtRes.body.document_number, /^DDT-/);

    const invoiceRes = await request(app)
      .post(`/sales/delivery-notes/${ddtId}/convert-to-invoice`)
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(invoiceRes.status, 201);
    assert.match(invoiceRes.body.document_number, /^FAT-/);
    assert.equal(invoiceRes.body.sdi_status, 'NOT_SENT');

    const quoteDetail = await request(app)
      .get(`/sales/quotes/${quoteId}`)
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(quoteDetail.body.quote.status, 'CONVERTED');
    assert.equal(quoteDetail.body.lines.length, 1);

    const statsRes = await request(app)
      .get('/sales/stats')
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(statsRes.status, 200);
    assert.equal(statsRes.body.invoices, 1);
  });

  test('tenant B cannot read tenant A quote', async () => {
    const tenantA = await registerTenant('Sales A', uniqueEmail('sales-a'));
    const tenantB = await registerTenant('Sales B', uniqueEmail('sales-b'));

    const createRes = await request(app)
      .post('/sales/quotes')
      .set('Authorization', `Bearer ${tenantA.token}`)
      .send({
        customerName: 'Cliente A',
        lines: [{ description: 'Prodotto', quantity: 1, unitPrice: 50 }],
      });
    assert.equal(createRes.status, 201);

    const leakRes = await request(app)
      .get(`/sales/quotes/${createRes.body.id}`)
      .set('Authorization', `Bearer ${tenantB.token}`);
    assert.equal(leakRes.status, 404);
  });
});

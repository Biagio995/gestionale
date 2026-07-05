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

describe('fiscal and SDI', () => {
  before(async () => {
    await pool.query('SELECT 1');
  });

  test('rejects invalid VAT on quote creation', async () => {
    const session = await registerTenant('Fiscal Co', uniqueEmail('fiscal-invalid'));

    const res = await request(app)
      .post('/sales/quotes')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        customerName: 'Cliente Test',
        customerVatNumber: 'IT12345678901',
        lines: [{ description: 'Servizio', quantity: 1, unitPrice: 100 }],
      });
    assert.equal(res.status, 400);
    assert.equal(res.body.messageKey, 'errors.invalidVatNumber');
  });

  test('validate VAT endpoint returns checksum result', async () => {
    const session = await registerTenant('Vat Co', uniqueEmail('vat-check'));

    const valid = await request(app)
      .post('/sales/fiscal/validate-vat')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ vatNumber: 'IT12345678903' });
    assert.equal(valid.status, 200);
    assert.equal(valid.body.valid, true);

    const invalid = await request(app)
      .post('/sales/fiscal/validate-vat')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ vatNumber: 'IT12345678901' });
    assert.equal(invalid.status, 200);
    assert.equal(invalid.body.valid, false);
  });

  test('invoice SDI send archives XML and updates status', async () => {
    const session = await registerTenant('Sdi Co', uniqueEmail('sdi-send'));

    const profileRes = await request(app)
      .put('/sales/fiscal/profile')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        legalName: 'Sdi Co SRL',
        vatNumber: 'IT12345678903',
        taxCode: '12345678903',
        address: 'Via Roma 1',
        city: 'Milano',
        zipCode: '20100',
        province: 'MI',
        sdiCode: 'ABCDEF1',
        pecEmail: 'fatture@sdi-co.it',
      });
    assert.equal(profileRes.status, 200);

    const quoteRes = await request(app)
      .post('/sales/quotes')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        customerName: 'Cliente SDI',
        customerCompanyName: 'Cliente SPA',
        customerVatNumber: 'IT12345678903',
        customerSdiCode: 'XYZAB12',
        lines: [{ description: 'Prodotto', quantity: 1, unitPrice: 200, taxRate: 22 }],
      });
    assert.equal(quoteRes.status, 201);

    const orderRes = await request(app)
      .post(`/sales/quotes/${quoteRes.body.id}/convert-to-order`)
      .set('Authorization', `Bearer ${session.token}`);
    const ddtRes = await request(app)
      .post(`/sales/orders/${orderRes.body.id}/convert-to-delivery-note`)
      .set('Authorization', `Bearer ${session.token}`);
    const invoiceRes = await request(app)
      .post(`/sales/delivery-notes/${ddtRes.body.id}/convert-to-invoice`)
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(invoiceRes.status, 201);

    const issueRes = await request(app)
      .post(`/sales/invoices/${invoiceRes.body.id}/issue`)
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(issueRes.status, 200);
    assert.equal(issueRes.body.status, 'ISSUED');

    const sdiRes = await request(app)
      .post(`/sales/invoices/${invoiceRes.body.id}/send-sdi`)
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(sdiRes.status, 200);
    assert.equal(sdiRes.body.invoice.sdi_status, 'ACCEPTED');

    const xmlRes = await request(app)
      .get(`/sales/invoices/${invoiceRes.body.id}/xml`)
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(xmlRes.status, 200);
    assert.match(xmlRes.body.xml, /FatturaElettronica/);

    const paymentRes = await request(app)
      .patch(`/sales/invoices/${invoiceRes.body.id}/payment`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({ paidAmount: Number(invoiceRes.body.total) });
    assert.equal(paymentRes.status, 200);
    assert.equal(paymentRes.body.payment_status, 'PAID');
  });

  test('passive invoice registration', async () => {
    const session = await registerTenant('Passive Co', uniqueEmail('passive'));

    const res = await request(app)
      .post('/sales/passive-invoices')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        supplierName: 'Fornitore SPA',
        supplierVatNumber: 'IT12345678903',
        documentNumber: 'FP-2026-001',
        invoiceDate: '2026-07-01',
        total: 122,
        taxTotal: 22,
      });
    assert.equal(res.status, 201);
    assert.equal(res.body.payment_status, 'UNPAID');
  });

  test('quote PDF export and draft update', async () => {
    const session = await registerTenant('Pdf Co', uniqueEmail('pdf-quote'));

    const profileRes = await request(app)
      .put('/sales/fiscal/profile')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        legalName: 'Pdf Co SRL',
        vatNumber: 'IT12345678903',
        taxCode: '12345678903',
        address: 'Via Test 1',
        city: 'Roma',
        zipCode: '00100',
        province: 'RM',
        sdiCode: 'ABCDEF1',
        pecEmail: 'fatture@pdf-co.it',
      });
    assert.equal(profileRes.status, 200);

    const createRes = await request(app)
      .post('/sales/quotes')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        customerName: 'Cliente PDF',
        lines: [{ description: 'Servizio', quantity: 1, unitPrice: 50, taxRate: 22 }],
      });
    assert.equal(createRes.status, 201);
    const quoteId = createRes.body.id as string;

    const pdfRes = await request(app)
      .get(`/sales/quotes/${quoteId}/pdf`)
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers['content-type'], 'application/pdf');
    assert.ok(pdfRes.body.length > 100);

    const updateRes = await request(app)
      .put(`/sales/quotes/${quoteId}`)
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        customerName: 'Cliente PDF Aggiornato',
        lines: [{ description: 'Servizio aggiornato', quantity: 2, unitPrice: 75, taxRate: 22 }],
      });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.customer_name, 'Cliente PDF Aggiornato');
    assert.equal(Number(updateRes.body.total), 183);
  });

  test('scadenzario and fiscal dashboard', async () => {
    const session = await registerTenant('Scad Co', uniqueEmail('scadenzario'));

    const passiveRes = await request(app)
      .post('/sales/passive-invoices')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        supplierName: 'Fornitore Scad',
        supplierVatNumber: 'IT12345678903',
        documentNumber: 'FP-SCAD-1',
        invoiceDate: '2026-07-01',
        dueDate: '2026-07-15',
        total: 122,
        taxTotal: 22,
      });
    assert.equal(passiveRes.status, 201);

    const scadRes = await request(app)
      .get('/sales/scadenzario')
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(scadRes.status, 200);
    assert.ok(Array.isArray(scadRes.body));
    assert.ok(scadRes.body.some((e: { document_number: string }) => e.document_number === 'FP-SCAD-1'));

    const dashRes = await request(app)
      .get('/sales/fiscal/dashboard')
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(dashRes.status, 200);
    assert.ok(typeof dashRes.body.unpaidPassive === 'number');
  });

  test('passive invoice XML import', async () => {
    const session = await registerTenant('Xml Co', uniqueEmail('xml-import'));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FatturaElettronica>
  <Denominazione>Fornitore XML SPA</Denominazione>
  <IdCodice>12345678903</IdCodice>
  <Numero>FP-XML-001</Numero>
  <Data>2026-07-02</Data>
  <Divisa>EUR</Divisa>
  <ImponibileImporto>200</ImponibileImporto>
  <Imposta>44</Imposta>
  <ImportoTotaleDocumento>244</ImportoTotaleDocumento>
</FatturaElettronica>`;

    const importRes = await request(app)
      .post('/sales/passive-invoices/import-xml')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ xmlContent: xml });
    assert.equal(importRes.status, 201);
    assert.equal(importRes.body.document_number, 'FP-XML-001');
    assert.equal(importRes.body.supplier_name, 'Fornitore XML SPA');
    assert.equal(Number(importRes.body.total), 244);
  });
});

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../app.js';
import { pool } from '../db/pool.js';

const app = createApp();

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

async function registerTenant(name: string, email: string, password = 'password123') {
  const res = await request(app)
    .post('/auth/register')
    .send({ email, password, tenantName: name, language: 'it' });
  assert.equal(res.status, 201);
  return res.body as { token: string; user: { id: string; tenant_id: string } };
}

describe('tenant isolation', () => {
  before(async () => {
    await pool.query('SELECT 1');
  });

  test('tenant B cannot read tenant A item by id', async () => {
    const emailA = uniqueEmail('tenant-a-read');
    const emailB = uniqueEmail('tenant-b-read');
    const tenantA = await registerTenant('Azienda A Read', emailA);
    const tenantB = await registerTenant('Azienda B Read', emailB);

    const createRes = await request(app)
      .post('/items')
      .set('Authorization', `Bearer ${tenantA.token}`)
      .send({ name: 'Item segreto', description: 'solo tenant A' });
    assert.equal(createRes.status, 201);
    const itemId = createRes.body.id as string;

    const leakRes = await request(app)
      .get(`/items/${itemId}`)
      .set('Authorization', `Bearer ${tenantB.token}`);
    assert.equal(leakRes.status, 404);
  });

  test('tenant B cannot update tenant A item by id', async () => {
    const emailA = uniqueEmail('tenant-a');
    const emailB = uniqueEmail('tenant-b');
    const tenantA = await registerTenant('Azienda A', emailA);
    const tenantB = await registerTenant('Azienda B', emailB);

    const createRes = await request(app)
      .post('/items')
      .set('Authorization', `Bearer ${tenantA.token}`)
      .send({ name: 'Item segreto', description: 'solo tenant A' });
    assert.equal(createRes.status, 201);
    const itemId = createRes.body.id as string;

    const leakRes = await request(app)
      .put(`/items/${itemId}`)
      .set('Authorization', `Bearer ${tenantB.token}`)
      .send({ name: 'Hack', description: 'tentativo cross-tenant' });
    assert.equal(leakRes.status, 404);
  });

  test('deactivated user cannot access APIs', async () => {
    const adminEmail = uniqueEmail('admin');
    const userEmail = uniqueEmail('user');
    const admin = await registerTenant('Deactivate Co', adminEmail);

    const inviteRes = await request(app)
      .post('/users/invite')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: userEmail, role: 'USER' });
    assert.equal(inviteRes.status, 201);
    const token = new URL(inviteRes.body.inviteUrl as string).searchParams.get('token');
    assert.ok(token);

    const acceptRes = await request(app)
      .post('/auth/accept-invitation')
      .send({ token, password: 'password123', language: 'it' });
    assert.equal(acceptRes.status, 201);
    const member = acceptRes.body as { token: string; user: { id: string } };

    const listBefore = await request(app)
      .get('/items')
      .set('Authorization', `Bearer ${member.token}`);
    assert.equal(listBefore.status, 200);

    const deactivateRes = await request(app)
      .delete(`/users/${member.user.id}`)
      .set('Authorization', `Bearer ${admin.token}`);
    assert.equal(deactivateRes.status, 204);

    const listAfter = await request(app)
      .get('/items')
      .set('Authorization', `Bearer ${member.token}`);
    assert.equal(listAfter.status, 401);
  });

  test('password reset invalidates existing session', async () => {
    const email = uniqueEmail('reset');
    const session = await registerTenant('Reset Co', email);

    const forgotRes = await request(app)
      .post('/auth/forgot-password')
      .send({ email });
    assert.equal(forgotRes.status, 200);

    const tokenRes = await pool.query<{ token: string }>(
      `SELECT prt.token FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE u.email = $1 AND prt.used_at IS NULL
       ORDER BY prt.created_at DESC LIMIT 1`,
      [email.toLowerCase()],
    );
    const resetToken = tokenRes.rows[0]?.token;
    assert.ok(resetToken);

    const resetRes = await request(app)
      .post('/auth/reset-password')
      .send({ token: resetToken, password: 'newpassword123' });
    assert.equal(resetRes.status, 200);

    const staleRes = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(staleRes.status, 401);
  });

  test('sole admin cannot demote themselves', async () => {
    const adminEmail = uniqueEmail('solo-admin');
    const admin = await registerTenant('Solo Admin Co', adminEmail);

    const demoteRes = await request(app)
      .patch(`/users/${admin.user.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'USER' });
    assert.equal(demoteRes.status, 400);
    assert.equal(demoteRes.body.messageKey, 'errors.cannotChangeOwnRole');
  });

  test('onboarding status reflects tenant progress', async () => {
    const email = uniqueEmail('onboarding');
    const session = await registerTenant('Onboarding Co', email);

    const initialRes = await request(app)
      .get('/users/me/onboarding')
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(initialRes.status, 200);
    assert.equal(initialRes.body.steps.createFirstItem, false);
    assert.equal(initialRes.body.steps.inviteColleague, false);
    assert.equal(initialRes.body.completed, false);

    const createRes = await request(app)
      .post('/items')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ name: 'Primo elemento', description: 'onboarding' });
    assert.equal(createRes.status, 201);

    const afterItemRes = await request(app)
      .get('/users/me/onboarding')
      .set('Authorization', `Bearer ${session.token}`);
    assert.equal(afterItemRes.status, 200);
    assert.equal(afterItemRes.body.steps.createFirstItem, true);
  });
});

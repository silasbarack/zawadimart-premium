import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, pool, registerUser, resetDatabase } from './helpers.js';

before(resetDatabase);
after(() => pool.end());

describe('auth', () => {
  it('registers, signs in by email or phone, and returns the profile', async () => {
    const { user, token } = await registerUser({ email: 'Wanjiku@Example.com', phone: '+254 712 000 111' });
    assert.equal(user.email, 'wanjiku@example.com');
    assert.equal(user.phone, '254712000111');
    assert.equal(user.role, 'customer');
    assert.ok(!('password_hash' in user));

    const me = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    assert.equal(me.body.user.id, user.id);

    const byEmail = await api().post('/api/auth/login').send({ email: 'WANJIKU@example.com', password: 'password123' }).expect(200);
    assert.ok(byEmail.body.token);
    const byPhone = await api().post('/api/auth/login').send({ identifier: '0712000111', password: 'password123' }).expect(200);
    assert.equal(byPhone.body.user.id, user.id);
  });

  it('rejects duplicates, wrong passwords and weak input', async () => {
    await registerUser({ email: 'dup@example.com', phone: '0711222333' });
    const dupEmail = await api().post('/api/auth/register').send({ name: 'Dup', email: 'DUP@example.com', password: 'password123' }).expect(409);
    assert.match(dupEmail.body.error, /email/);
    await api().post('/api/auth/register').send({ name: 'Dup', email: 'other@example.com', phone: '254711222333', password: 'password123' }).expect(409);
    await api().post('/api/auth/login').send({ identifier: 'dup@example.com', password: 'wrong-password' }).expect(401);
    await api().post('/api/auth/login').send({ identifier: 'nobody@example.com', password: 'password123' }).expect(401);
    const weak = await api().post('/api/auth/register').send({ name: 'A', email: 'bad', password: 'short' }).expect(400);
    assert.deepEqual(weak.body.details.map((d) => d.field).sort(), ['email', 'name', 'password']);
  });

  it('requires a valid token for protected routes', async () => {
    await api().get('/api/auth/me').expect(401);
    await api().get('/api/auth/me').set('Authorization', 'Bearer not-a-token').expect(401);
    await api().get('/api/cart').expect(401);
  });

  it('updates the profile and changes the password', async () => {
    const { token } = await registerUser({ email: 'update@example.com', phone: '0722000000' });
    const auth = { Authorization: `Bearer ${token}` };
    const res = await api().patch('/api/auth/me').set(auth).send({ name: 'Amina W.', phone: '' }).expect(200);
    assert.equal(res.body.user.name, 'Amina W.');
    assert.equal(res.body.user.phone, null);

    await api().post('/api/auth/me/password').set(auth).send({ currentPassword: 'nope', newPassword: 'new-password-1' }).expect(400);
    await api().post('/api/auth/me/password').set(auth).send({ currentPassword: 'password123', newPassword: 'new-password-1' }).expect(204);
    await api().post('/api/auth/login').send({ identifier: 'update@example.com', password: 'new-password-1' }).expect(200);
  });
});

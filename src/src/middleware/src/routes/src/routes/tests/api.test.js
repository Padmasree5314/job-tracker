const request = require('supertest');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

let app;
const creds = { email: 'padma@example.com', password: 'strongpass123' };

async function tokenFor(user = creds) {
  await request(app).post('/api/auth/register').send(user);
  const res = await request(app).post('/api/auth/login').send(user);
  return res.body.token;
}

beforeEach(() => {
  app = createApp(createDb(':memory:'), 'test-secret');
});

describe('auth', () => {
  test('registers and logs in', async () => {
    const reg = await request(app).post('/api/auth/register').send(creds);
    expect(reg.status).toBe(201);
    const login = await request(app).post('/api/auth/login').send(creds);
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();
  });

  test('rejects duplicate email, weak password, bad email', async () => {
    await request(app).post('/api/auth/register').send(creds);
    expect((await request(app).post('/api/auth/register').send(creds)).status).toBe(409);
    expect((await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: '123' })).status).toBe(400);
    expect((await request(app).post('/api/auth/register').send({ email: 'nope', password: 'longenough1' })).status).toBe(400);
  });

  test('rejects wrong password', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const res = await request(app).post('/api/auth/login').send({ ...creds, password: 'wrongpass123' });
    expect(res.status).toBe(401);
  });

  test('protected routes need a token', async () => {
    expect((await request(app).get('/api/applications')).status).toBe(401);
    expect((await request(app).get('/api/applications').set('Authorization', 'Bearer junk')).status).toBe(401);
  });
});

describe('applications', () => {
  test('full CRUD flow', async () => {
    const token = await tokenFor();
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post('/api/applications').set(auth).send({ company: 'Zoho', role: 'SDE' });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('Applied');
    const id = created.body.id;

    const updated = await request(app).put(`/api/applications/${id}`).set(auth).send({ status: 'Interview' });
    expect(updated.body.status).toBe('Interview');

    const list = await request(app).get('/api/applications').set(auth);
    expect(list.body).toHaveLength(1);

    expect((await request(app).delete(`/api/applications/${id}`).set(auth)).status).toBe(204);
    expect((await request(app).delete(`/api/applications/${id}`).set(auth)).status).toBe(404);
  });

  test('validates input', async () => {
    const auth = { Authorization: `Bearer ${await tokenFor()}` };
    expect((await request(app).post('/api/applications').set(auth).send({ role: 'SDE' })).status).toBe(400);
    expect(
      (await request(app).post('/api/applications').set(auth).send({ company: 'X', role: 'Y', status: 'Nope' })).status
    ).toBe(400);
  });

  test('filters and searches', async () => {
    const auth = { Authorization: `Bearer ${await tokenFor()}` };
    await request(app).post('/api/applications').set(auth).send({ company: 'Zoho', role: 'SDE', status: 'Offer' });
    await request(app).post('/api/applications').set(auth).send({ company: 'Freshworks', role: 'QA Engineer' });
    expect((await request(app).get('/api/applications?status=Offer').set(auth)).body).toHaveLength(1);
    expect((await request(app).get('/api/applications?q=fresh').set(auth)).body).toHaveLength(1);
  });

  test('stats count per status', async () => {
    const auth = { Authorization: `Bearer ${await tokenFor()}` };
    await request(app).post('/api/applications').set(auth).send({ company: 'A', role: 'x' });
    await request(app).post('/api/applications').set(auth).send({ company: 'B', role: 'y', status: 'Offer' });
    const res = await request(app).get('/api/applications/stats').set(auth);
    expect(res.body.total).toBe(2);
    expect(res.body.byStatus.Offer).toBe(1);
  });

  test("users cannot see or change each other's data", async () => {
    const a = { Authorization: `Bearer ${await tokenFor()}` };
    const b = { Authorization: `Bearer ${await tokenFor({ email: 'other@example.com', password: 'anotherpass1' })}` };
    const created = await request(app).post('/api/applications').set(a).send({ company: 'Zoho', role: 'SDE' });
    expect((await request(app).get('/api/applications').set(b)).body).toHaveLength(0);
    expect((await request(app).put(`/api/applications/${created.body.id}`).set(b).send({ status: 'Offer' })).status).toBe(404);
    expect((await request(app).delete(`/api/applications/${created.body.id}`).set(b)).status).toBe(404);
  });
});

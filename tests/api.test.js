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
    const login = await request(app).post('/api/au

const request = require('supertest');
const app = require('../app');

describe('Health Check and 404 Handler', () => {
  it('GET /api/health should return status ok with current timestamp', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('time');
    expect(typeof res.body.time).toBe('string');
  });

  it('GET /api/unknown-route should return 404 with structured JSON error', async () => {
    const res = await request(app).get('/api/unknown-route');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body).toHaveProperty('message');
  });
});

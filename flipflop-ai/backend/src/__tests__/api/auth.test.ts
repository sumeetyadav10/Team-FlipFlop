import request from 'supertest';
import { app } from '../../index.js';

describe('Auth API', () => {
  describe('GET /api/auth/status', () => {
    it('should return unauthorized without token', async () => {
      const response = await request(app)
        .get('/api/auth/status')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/signup', () => {
    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/signin', () => {
    it('should require email and password', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
import request from 'supertest';
import app from '../server.js';
import { jest } from '@jest/globals';
import { User, VerificationCode } from '../models/index.js';

// For tests, define API_PREFIX
const API_PREFIX = process.env.API_PREFIX ? `/${process.env.API_PREFIX}` : '';

describe('Autenticação', () => {
  beforeEach(async () => {
    await User.destroy({ where: {} });
    await VerificationCode.destroy({ where: {} });
  });

  describe(`POST ${API_PREFIX}/auth/check-email`, () => {
    it('should check if email exists', async () => {
      await request(app)
      .post(`${API_PREFIX}/auth/check-email`)
      .send({
        email: 'test@example.com'
      })
      .expect(200);
    });

    it('should handle invalid input', async () => {
      await request(app)
      .post(`${API_PREFIX}/auth/check-email`)
      .send({
        email: 'invalid-email'
      })
      .expect(400);
    });
  });

  describe(`POST ${API_PREFIX}/auth/send-code`, () => {
    it('should send verification code', async () => {
      await request(app)
      .post(`${API_PREFIX}/auth/send-code`)
      .send({
        email: 'test@example.com'
      })
      .expect(200);
    });
  });
}); 